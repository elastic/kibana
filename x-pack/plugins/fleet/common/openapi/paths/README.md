Paths
=====

Organize our path definitions within this folder.  We will reference our paths from our main `openapi.json` entrypoint file.

It may help us to adopt some conventions:

* path separator token (e.g. `@`) or subfolders
* path parameter (e.g. `{example}`)
* file-per-path or file-per-operation

There are different benefits and drawbacks to each decision.  

We can adopt any organization we wish.  We have some tips for organizing paths based on common practices.

## Each path in a separate file

Use a predefined "path separator" and keep all of our path files in the top level of the `paths` folder.

```
paths/
├── README.md
├── agent_policies.yaml
├── agent_policies@delete.yaml
├── agent_policies@{agent_policy_id}.yaml
├── agent_policies@{agent_policy_id}@copy.yaml
├── agent_status.yaml
├── agents.yaml
├── agents@bulk_upgrade.yaml
├── agents@enroll.yaml
├── agents@setup.yaml
├── agents@{agent_id}.yaml
├── agents@{agent_id}@acks.yaml
├── agents@{agent_id}@checkin.yaml
├── agents@{agent_id}@events.yaml
├── agents@{agent_id}@unenroll.yaml
├── agents@{agent_id}@upgrade.yaml
├── enrollment_api_keys.yaml
├── enrollment_api_keys@{key_id}.yaml
├── epm@categories.yaml
├── epm@packages.yaml
├── epm@packages@{pkgkey}.yaml
├── install@{os_type}.yaml
├── package_policies.yaml
├── package_policies@{package_policy_id}.yaml
└── setup.yaml
```

Redocly recommends using the `@` character for this case.

In addition, Redocly recommends placing path parameters within `{}` curly braces if we adopt this style.

#### Motivations

* Quickly see a list of all paths.  Many people think in terms of the "number" of "endpoints" (paths), and not the "number" of "operations" (paths * http methods).

* Only the "file-per-path" option is semantically correct with the OpenAPI Specification 3.0.2.  However, Redocly's openapi-cli will build valid bundles for any of the other options too.


#### Drawbacks

* This may require multiple definitions per http method within a single file.
* It requires settling on a path separator (that is allowed to be used in filenames) and sticking to that convention.

## Each operation in a separate file

We may also place each operation in a separate file.  

In this case, if we want all paths at the top-level, we can concatenate the http method to the path name.  Similar to the above option, we can 

### Files at top-level of `paths`

We may name our files with some concatenation for the http method. For example, following a convention such as: `<path with allowed separator>-<http-method>.json`.

#### Motivations

* Quickly see all operations without needing to navigate subfolders.

#### Drawbacks

* Adopting an unusual path separator convention, instead of using subfolders.

### Use subfolders to mirror API path structure

Example:
```
GET /customers

/paths/customers/get.json
```

In this case, the path id defined within subfolders which mirror the API URL structure.

Example with path parameter:
```
GET /customers/{id}

/paths/customers/{id}/get.json
```

#### Motivations

It matches the URL structure.

It is pretty easy to reference:

```json
paths:
  '/customers/{id}':
    get:
      $ref: ./paths/customers/{id}/get.json
    put:
      $ref: ./paths/customers/{id}/put.json
```

#### Drawbacks

If we have a lot of nested folders, it may be confusing to reference our schemas.  

Example
```
file: /paths/customers/{id}/timeline/{messageId}/get.json

# excerpt of file
    headers:
      Rate-Limit-Remaining: 
        $ref: ../../../../../components/headers/Rate-Limit-Remaining.json

```
Notice the `../../../../../` in the ref which requires some attention to formulate correctly.  While openapi-cli has a linter which suggests possible refs when there is a mistake, this is still a net drawback for APIs with deep paths.
