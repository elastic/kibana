# connectors_networking plugin proof of concept

- 2021-03-18 - Patrick Mueller

This plugin is being developed as part of the resolution of
[issue #80120](https://github.com/elastic/kibana/issues/80120).

The basic idea is that we will be creating new saved objects to store general
networking settings per server acccessed by Kibana actions, and specifically TLS
options. The current name of the saved object type will be
something like `connectorsNetworkingOptions` (CNO).  

We'll change the way we make HTTP requests to 3rd party services, to look up the
server being accessed to see if there's a CNO saved object for it. If there is,
we'll take the options specifed in the saved object and apply them to the http
request that will be made.

## state of the proof of concept

To make sure the general flow above is even workable, the current proof of
concept implements the following pieces:

- client API for other plugins to get the CNO given a url
- HTTP CRUD APIs for CNOs
- augmented the http agent creation used by most of the connectors to look up
  the appropriate CNO and apply the properties to the agents

Specifically not implemented was the actual saved object back-end. Currently the
CNO's are stored in RAM - this was just a way to get going faster, and should
just be an "implementation detail" of the existing client without requiring
changes further up the stack.

The application of the CNO properties to the HTTP agents is currently just
enough to get the current test working - it will need a bit more work,
especially for proxy usage and smtp/node mailer.

Here's the current shape of the CNO's; the HTTP APIs, client APIs, and saved
objects have the same structure.

```js
export const ConnectorOptionsSchema = schema.object(
  {
    // human provided name
    name: schema.string({ minLength: 1 }),

    // only protocol, host, and port; only http, https, smtp protocols
    url: schema.string({ minLength: 1 }),

    // from https://nodejs.org/dist/latest-v14.x/docs/api/http.html#http_http_request_options_callback
    // for http, https, and smtp
    timeout: schema.nullable(schema.number({ min: 0 })),

    // smtp specific properties
    // for smtp only
    smtp: schema.nullable(
      schema.object({
        // below from https://nodemailer.com/smtp/
        ignore_tls: schema.nullable(schema.boolean()),
        require_tls: schema.nullable(schema.boolean()),
      })
    ),

    // tls specific properties
    // for https and smtp only
    tls: schema.nullable(
      schema.object({
        // below from https://nodejs.org/dist/latest-v14.x/docs/api/tls.html#
        reject_unauthorized: schema.nullable(schema.boolean()),
        min_dh_size: schema.nullable(schema.number({ min: 0 })),
        // below from https://nodejs.org/dist/latest-v14.x/docs/api/tls.html#tls_tls_createsecurecontext_options
        ca: schema.nullable(schema.string({ minLength: 1 })),
        sig_algs: schema.nullable(schema.string({ minLength: 1 })),
        ciphers: schema.nullable(schema.string({ minLength: 1 })),
        dh_param: schema.nullable(schema.string({ minLength: 1 })),
        ecdh_curve: schema.nullable(schema.string({ minLength: 1 })),
        max_version: schema.nullable(schema.string({ minLength: 1 })),
        min_version: schema.nullable(schema.string({ minLength: 1 })),
      })
    ),
  },
  { validate: validateConnectorOptions }
);
```


## some design decisions

### CNO's properties are TLS params, and ca certificates

Does not include client-side certs, keys, etc. Not clear we need this, and at
least seems like it can be deferred.  Client-side certs/keys are needed for
more secure networking where the server need to authenticate the client at
the TLS level.  It's not used as much as the basic TLS ca certificates, which
are used to let the client authenticate the server at the TLS level.

### CNO's are space agnostic

For our current usage, it's not clear that we would need space-specific CNO's,
since the options are all about validating the server is who it says it is. 
Would one space want to verify a server, and another not?

I guess we have to think about the future.  What if we want to add something here
that _should_ be space specific.  It would certainly be some new sort of data,
so would probably require a new saved object, which _could_ be space specific.

### CNO's are unique by protocol : hostname : port

For now anyway, it seems possible to get by with having CNO objects be unique
just by protocol / hostname / port - without considering any path, query string
parameters, user/pass, etc. TLS certificates only go to this granularity as
well. If needed, in the future, we could extend this with path's or other
factors.

We'll canonicalize the url, by only using the protocol, hostname, and port from
provided urls, and add the default port for the protocol if not provided in the
url.

This breaks for the only generic option, `timeout`.  Presumably you should be
able to set a specific timeout for a specific url pattern that could include
a path.  For example, you might use the default timeout for most requests,
but then a certain API like `/api/digits-of-pi` might need a longer timeout,
so it would be nice to constrain the longer timeout to just that URL.  Perhaps
that's another good reason to remove the `timeout` option.  We could re-visit
allowing path elements (and query string params? headers?) later.

### CNO's are "matched" to URLs, not specifically assigned

Rather than have to assign a CNO to a specific connector, we're taking
advantage of the fact that TLS options are specific to the hostname and port,
and only applicable to https and smtp.  This allows us to create the CNO's
independent of the connectors - they could be created BEFORE the connectors
are created.  And once created, and new connectors using the same hostname
and port will pick up the CNO without any direct association.

This works out great, in practice, but am wondering if I missed some gotchas
with it.

In fact, having written that bit above about creating CNO's "early", these CNO's
are perhaps good fodder for Kibana config - a way of pre-registering them, where
we could (potentially) have the customers provide PEMs as file names (for
on-prem; clould would need to support PEM's as strings of the file contents (7
bit ascii anyway!)).

In fact, having written that, if we could do this, we could perhaps ship this
without any management UI for now, and only allow CNO's via config.  We 
wouldn't need the saved objects at all.  

:wondering:

### CNO ids will be canonical URLs

Kinda.  We don't want `/` chars in there, because we want to use "ids" as 
path parameters for REST APIs, so we'll create keys with protocol / hostname /
port, separated by `:` chars.  Eg, URL `https://elastic.co` becomes key/id
`https:elastic.co:443`.

I know generally we use UUIDs as saved object ids, and especially for encrypted
saved objects ids - is it a problem using these as ids?  

The reason we want a canonical URL as the id is so that we can guarantee
uniqueness of the documents.  If we used UUIDs as ids, and the canonical
URL is a property we try to keep unique ... things will be painful.  We'll
potentially have multiple CNOs with the same canonical URLs, so will have
to do some kind of maintenance check for duplicates, and then how do we even
resolve that?

### plugin client only exposes a findByUrl() function

I think that plugin clients will only need access to the `findByUrl()`
functionality, they won't need access to the "CRUD"-level access that the
HTTP APIs will need.  So we shouldn't expose those.  So this client is a little
different than some of the usual alerting ones, where the HTTP request
handlers typically get access to the plugin client to do their work. 

### access to the tls.ca field (and future "secret" fields?) via HTTP

Currently the only field I think we need to encrypt is the `tls.ca` field,
and I think technically it probably doesn't even need to be encrypted, since
it's basically a public key.  But feels like we should encrypt it anyway, 
since I imagine someone could be concerned if they poked through the saved
objects and saw rando certificates in there.  Since I'm not sure it's obvious
looking at a PEM-encoded cert, if it is really "secret" or publishable.

But I think we can break the mold of how we've treated ESO secrets in alerting
thus far - by not returning them in HTTP APIs.  This makes it harder for
customers to update connectors, since for any field they want to access, they'll
need to re-enter the secrets.  This would be even more painful with PEM-encoded
certs, especially if a chain was involved.  Feels like we can return these 
in at least some APIs, to allow easier editing of the CNO's over time, if the
`tls.ca` field isn't changing but other things are.  Fair to say sometimes
you're trying all kinds of TLS options when trying to get a connection to work,
and having to re-enter the certs in those situations would get real old real
fast.

In the future, we may need to store REAL secrets in here - client certs and
keys, specifically.  Those would absolutely need to be in an ESO, and we'd
have to think about cases where we might want them returned in HTTP responses.

## remaining work items till this is deliverable

- store CNO's in encrypted saved objects
- complete work for customizing agents 
- feature controls / privileges
- support for smtp via nodemailer
- support for slack using it's SDK
- management ui for CNO's - CRUD support
- enhance existing connectors/actions to show applicable CNO, link for more info
- docs
- tests
- feature flag?

## future work

- I think moving all the axios-related code in the actions plugin into this
  new plugin makes sense.  It will allow us to largely hide axios as an
  implementation detail, but more importantly cut down on the amount of
  cross-talk required between actions and this new plugin.  Probably means
  also moving networking config properties in actions to the new plugin,
  so that will require some deprecation.

## trying it out

A bash script is provided in this file:

- `x-pack/plugins/connectors_networking/server/routes/test.sh`

The script creates a webhook that points back into Kibana, posting to a 
bogus link.  Since running Kibana locally with security on implies you are
running Kibana with a self-signed certificate, we can use this non-functional
url to compare running with `rejectAuthenticated` as `true` and `false` to 
make sure the property is being applied.  When `true` the webhook should fail
with a TLS self-signed cert error, and when `false` the webhook should fail
with a plain old 404 error, which implies it made it through the TLS auth.

It also runs a test using the ca that is used to sign the cert that Kibana
runs with in dev mode.  This ensures that you can actually set a per-server
ca and have it used on the request.

Enable debug logging via the following in your `kibana.dev.yml`:

```
logging:
  loggers:
    - name: plugins.actions
      level: debug
      appenders: [console]
    - name: plugins.connectorsNetworking
      level: debug
      appenders: [console]
```

## open questions

- Names!  connectorsNetworking?  erghh.  should we use actions instead?

- Do we need to make the saved objects hidden?  I don't think so, but worth
  asking

- Should these saved objects be global or space-specific or shared?

- Do we need a new privilege to use the CRUD APIs on the saved objects? Or
  maybe just the mutating APIs?  The lowest privilege to access these would
  be general access to actions.  It seems like we could use the actions
  feature control to control access to these saved objects.

- We'll probably want a way for a privileged-enough user creating or editing
  a connector to add a new CNO right from the connector UI

- Do all our connectors use axios?  Nodemailer is a special case for mail, but
  I think the only connector not directly using axios is Slack, so perhaps we
  should stop using Slack's thin shim over axios, and implement it with axios
  ourselves.  Are there more?

## one more thing - maybe this is just Kibana config?

Since thinking of doing this all via Kibana config, it's kinda stuck in my
mind.  I suspect it would be good enough for most customers, and a full
UI treatment probably is over-kill, if customers are likely to need just a
handful (or less) of these.

If we were to do this, we could follow the lead of preconfigured actions,
in terms of design/implementation, in preparation if we ever had to do saved
objects as well (since actions supports both).

Means no UI, no HTTP APIs.  Code is almost done :-)

Here's a sample yaml file that generates the object shape you would expect,
to see how ugly it can get.  Note we'd be having customers have to enter this 
in a web form, for cloud, in the existing Kibana config section.

```yaml
xpack.connectorsNetworking.options:
- url: https://localhost:5601
  name: dev-time certificates for kibana localhost
  tls:
    rejectUnauthorized: true
    ca: |
      -----BEGIN CERTIFICATE-----
      MIIDSzCCAjOgAwIBAgIUW0brhEtYK3tUBYlXnUa+AMmAX6kwDQYJKoZIhvcNAQEL
      BQAwNDEyMDAGA1UEAxMpRWxhc3RpYyBDZXJ0aWZpY2F0ZSBUb29sIEF1dG9nZW5l
      cmF0ZWQgQ0EwIBcNMTkxMjI3MTcwMjMyWhgPMjA2OTEyMTQxNzAyMzJaMDQxMjAw
      BgNVBAMTKUVsYXN0aWMgQ2VydGlmaWNhdGUgVG9vbCBBdXRvZ2VuZXJhdGVkIENB
      MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAplO5m5Xy8xERyA0/G5SM
      Nu2QXkfS+m7ZTFjSmtwqX7BI1I6ISI4Yw8QxzcIgSbEGlSqb7baeT+A/1JQj0gZN
      KOnKbazl+ujVRJpsfpt5iUsnQyVPheGekcHkB+9WkZPgZ1oGRENr/4Eb1VImQf+Y
      yo/FUj8X939tYW0fficAqYKv8/4NWpBUbeop8wsBtkz738QKlmPkMwC4FbuF2/bN
      vNuzQuRbGMVmPeyivZJRfDAMKExoXjCCLmbShdg4dUHsUjVeWQZ6s4vbims+8qF9
      b4bseayScQNNU3hc5mkfhEhSM0KB0lDpSvoCxuXvXzb6bOk7xIdYo+O4vHUhvSkQ
      mwIDAQABo1MwUTAdBgNVHQ4EFgQUGu0mDnvDRnBdNBG8DxwPdWArB0kwHwYDVR0j
      BBgwFoAUGu0mDnvDRnBdNBG8DxwPdWArB0kwDwYDVR0TAQH/BAUwAwEB/zANBgkq
      hkiG9w0BAQsFAAOCAQEASv/FYOwWGnQreH8ulcVupGeZj25dIjZiuKfJmslH8QN/
      pVCIzAxNZjGjCpKxbJoCu5U9USaBylbhigeBJEq4wmYTs/WPu4uYMgDj0MILuHin
      RQqgEVG0uADGEgH2nnk8DeY8gQvGpJRQGlXNK8pb+pCsy6F8k/svGOeBND9osHfU
      CVEo5nXjfq6JCFt6hPx7kl4h3/j3C4wNy/Dv/QINdpPsl6CnF17Q9R9d60WFv42/
      pkl7W1hszCG9foNJOJabuWfVoPkvKQjoCvPitZt/hCaFZAW49PmAVhK+DAohQ91l
      TZhDmYqHoXNiRDQiUT68OS7RlfKgNpr/vMTZXDxpmw==
      -----END CERTIFICATE-----
- url: smtp://localhost:5601
  name: custom certificate for joe bob mail engine
  smtp:
    require_tls: true
  tls:
    rejectUnauthorized: true
    ca: |
      -----BEGIN CERTIFICATE-----
      MIIDSzCCAjOgAwIBAgIUW0brhEtYK3tUBYlXnUa+AMmAX6kwDQYJKoZIhvcNAQEL
      BQAwNDEyMDAGA1UEAxMpRWxhc3RpYyBDZXJ0aWZpY2F0ZSBUb29sIEF1dG9nZW5l
      cmF0ZWQgQ0EwIBcNMTkxMjI3MTcwMjMyWhgPMjA2OTEyMTQxNzAyMzJaMDQxMjAw
      BgNVBAMTKUVsYXN0aWMgQ2VydGlmaWNhdGUgVG9vbCBBdXRvZ2VuZXJhdGVkIENB
      MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAplO5m5Xy8xERyA0/G5SM
      Nu2QXkfS+m7ZTFjSmtwqX7BI1I6ISI4Yw8QxzcIgSbEGlSqb7baeT+A/1JQj0gZN
      KOnKbazl+ujVRJpsfpt5iUsnQyVPheGekcHkB+9WkZPgZ1oGRENr/4Eb1VImQf+Y
      yo/FUj8X939tYW0fficAqYKv8/4NWpBUbeop8wsBtkz738QKlmPkMwC4FbuF2/bN
      vNuzQuRbGMVmPeyivZJRfDAMKExoXjCCLmbShdg4dUHsUjVeWQZ6s4vbims+8qF9
      b4bseayScQNNU3hc5mkfhEhSM0KB0lDpSvoCxuXvXzb6bOk7xIdYo+O4vHUhvSkQ
      mwIDAQABo1MwUTAdBgNVHQ4EFgQUGu0mDnvDRnBdNBG8DxwPdWArB0kwHwYDVR0j
      BBgwFoAUGu0mDnvDRnBdNBG8DxwPdWArB0kwDwYDVR0TAQH/BAUwAwEB/zANBgkq
      hkiG9w0BAQsFAAOCAQEASv/FYOwWGnQreH8ulcVupGeZj25dIjZiuKfJmslH8QN/
      pVCIzAxNZjGjCpKxbJoCu5U9USaBylbhigeBJEq4wmYTs/WPu4uYMgDj0MILuHin
      RQqgEVG0uADGEgH2nnk8DeY8gQvGpJRQGlXNK8pb+pCsy6F8k/svGOeBND9osHfU
      CVEo5nXjfq6JCFt6hPx7kl4h3/j3C4wNy/Dv/QINdpPsl6CnF17Q9R9d60WFv42/
      pkl7W1hszCG9foNJOJabuWfVoPkvKQjoCvPitZt/hCaFZAW49PmAVhK+DAohQ91l
      TZhDmYqHoXNiRDQiUT68OS7RlfKgNpr/vMTZXDxpmw==
      -----END CERTIFICATE-----
```