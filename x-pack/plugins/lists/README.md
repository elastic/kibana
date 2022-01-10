The `lists` plugin contains logic for both large value lists and exception lists. 

### Lists

A list (sometimes referred to as large value lists) is made up of two parts: the container and the items. The container defines what Elasticsearch data type the list items are and the items are documents containing the values themselves. The lists plugin does not prescribe *how* the lists are used, just provides the services for creating, editing and maintaining them.

The following data types can be used:
- boolean
- byte
- date
- date_nanos
- date_range
- double
- double_range
- float
- float_range
- half_float
- integer
- integer_range
- ip
- ip_range
- keyword
- long
- long_range
- short
- text

See Kibana documentation on lists [here](https://www.elastic.co/guide/en/security/current/lists-api-overview.html).

### Exceptions

An exception list is also made up of two parts: the container and the items. It's important to note that though the word "exceptions" may make you think of exclusion functionality, an exception list itself does not denote inclusion or exclusion - that logic is determined by the consumer of the exception list.

Exception lists do however contain more built in logic than large value lists. They follow these rules:
- exception items get `OR`-ed together
- entries within an exception item get `AND`-ed together

So let's say you have an exception list `My Exception List` and it contains two items:
- Item 1 has `entries` of logic `A & B & C`
- Item 2 has `entries` of logic `B & D`

This exception list logic here would be `(A & B & C) || (B & D)`.

See Kibana documentation on exceptions [here](https://www.elastic.co/guide/en/security/current/exceptions-api-overview.html).

#### Getting Started

README.md for developers working on the backend lists on how to get started
using the CURL scripts in the scripts folder.

The scripts rely on CURL and jq:

- [CURL](https://curl.haxx.se)
- [jq](https://stedolan.github.io/jq/)

Install curl and jq (mac instructions)

```sh
brew update
brew install curl
brew install jq
```

Open `$HOME/.zshrc` or `${HOME}.bashrc` depending on your SHELL output from `echo $SHELL`
and add these environment variables:

```sh
export ELASTICSEARCH_USERNAME=${user}
export ELASTICSEARCH_PASSWORD=${password}
export ELASTICSEARCH_URL=https://${ip}:9200
export KIBANA_URL=http://localhost:5601
```

source `$HOME/.zshrc` or `${HOME}.bashrc` to ensure variables are set:

```sh
source ~/.zshrc
```

Open your `kibana.dev.yml` file and add these lines with your name:

```sh
xpack.lists.listIndex: '.lists-your-name'
xpack.lists.listItemIndex: '.items-your-name'
```

Restart Kibana and ensure that you are using `--no-base-path` as changing the base path is a feature but will
get in the way of the CURL scripts written as is.

Go to the scripts folder `cd kibana/x-pack/plugins/lists/server/scripts` and run:

```sh
./hard_reset.sh
./post_list.sh
```

which will:

- Delete any existing lists you have
- Delete any existing list items you have
- Delete any existing exception lists you have
- Delete any existing exception list items you have
- Delete any existing mapping, policies, and templates, you might have previously had.
- Add the latest list and list item index and its mappings using your settings from `kibana.dev.yml` environment variable of `xpack.lists.listIndex` and `xpack.lists.listItemIndex`.
- Posts the sample list from `./lists/new/ip_list.json`

Now you can run

```sh
./post_list.sh
```

You should see the new list created like so:

```sh
{
  "id": "ip_list",
  "created_at": "2020-05-28T19:15:22.344Z",
  "created_by": "yo",
  "description": "This list describes bad internet ip",
  "name": "Simple list with an ip",
  "tie_breaker_id": "c57efbc4-4977-4a32-995f-cfd296bed521",
  "type": "ip",
  "updated_at": "2020-05-28T19:15:22.344Z",
  "updated_by": "yo"
}
```

You can add a list item like so:

```sh
 ./post_list_item.sh
```

You should see the new list item created and attached to the above list like so:

```sh
{
  "id": "hand_inserted_item_id",
  "type": "ip",
  "value": "127.0.0.1",
  "created_at": "2020-05-28T19:15:49.790Z",
  "created_by": "yo",
  "list_id": "ip_list",
  "tie_breaker_id": "a881bf2e-1e17-4592-bba8-d567cb07d234",
  "updated_at": "2020-05-28T19:15:49.790Z",
  "updated_by": "yo"
}
```

If you want to post an exception list it would be like so:

```sh
./post_exception_list.sh
```

You should see the new exception list created like so:

```sh
{
  "created_at": "2020-05-28T19:16:31.052Z",
  "created_by": "yo",
  "description": "This is a sample endpoint type exception",
  "id": "bcb94680-a117-11ea-ad9d-c71f4820e65b",
  "list_id": "endpoint_list",
  "name": "Sample Endpoint Exception List",
  "namespace_type": "single",
  "tags": [
    "user added string for a tag",
    "malware"
  ],
  "tie_breaker_id": "86e08c8c-c970-4b08-a6e2-cdba7bb4e023",
  "type": "endpoint",
  "updated_at": "2020-05-28T19:16:31.080Z",
  "updated_by": "yo"
}
```

And you can attach exception list items like so:

```ts
{
  "comments": [],
  "created_at": "2020-05-28T19:17:21.099Z",
  "created_by": "yo",
  "description": "This is a sample endpoint type exception",
  "entries": [
    {
      "field": "actingProcess.file.signer",
      "operator": "included",
      "type": "match",
      "value": "Elastic, N.V."
    },
    {
      "field": "event.category",
      "operator": "included",
      "type": "match_any",
      "value": [
        "process",
        "malware"
      ]
    }
  ],
  "id": "da8d3b30-a117-11ea-ad9d-c71f4820e65b",
  "item_id": "endpoint_list_item",
  "list_id": "endpoint_list",
  "name": "Sample Endpoint Exception List",
  "namespace_type": "single",
  "os_types": ["linux"],
  "tags": [
    "user added string for a tag",
    "malware"
  ],
  "tie_breaker_id": "21f84703-9476-4af8-a212-aad31e18dcb9",
  "type": "simple",
  "updated_at": "2020-05-28T19:17:21.123Z",
  "updated_by": "yo"
}
```

You can then do find for each one like so:

```sh
./find_lists.sh
```

```sh
{
  "cursor": "WzIwLFsiYzU3ZWZiYzQtNDk3Ny00YTMyLTk5NWYtY2ZkMjk2YmVkNTIxIl1d",
  "data": [
    {
      "id": "ip_list",
      "created_at": "2020-05-28T19:15:22.344Z",
      "created_by": "yo",
      "description": "This list describes bad internet ip",
      "name": "Simple list with an ip",
      "tie_breaker_id": "c57efbc4-4977-4a32-995f-cfd296bed521",
      "type": "ip",
      "updated_at": "2020-05-28T19:15:22.344Z",
      "updated_by": "yo"
    }
  ],
  "page": 1,
  "per_page": 20,
  "total": 1
}
```

or for finding exception lists:

```sh
./find_exception_lists.sh
```

```sh
{
  "data": [
    {
      "created_at": "2020-05-28T19:16:31.052Z",
      "created_by": "yo",
      "description": "This is a sample endpoint type exception",
      "id": "bcb94680-a117-11ea-ad9d-c71f4820e65b",
      "list_id": "endpoint_list",
      "name": "Sample Endpoint Exception List",
      "namespace_type": "single",
      "os_types": ["linux"],
      "tags": [
        "user added string for a tag",
        "malware"
      ],
      "tie_breaker_id": "86e08c8c-c970-4b08-a6e2-cdba7bb4e023",
      "type": "endpoint",
      "updated_at": "2020-05-28T19:16:31.080Z",
      "updated_by": "yo"
    }
  ],
  "page": 1,
  "per_page": 20,
  "total": 1
}
```

See the full scripts folder for all the capabilities.
