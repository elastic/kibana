Paths
=====

Organize your path definitions within this folder.  You will reference your paths from your main `openapi.yaml` entrypoint file.

It may help you to adopt some conventions:

* path separator token (e.g. `@`) or subfolders
* path parameter (e.g. `{example}`)
* file-per-path or file-per-operation

There are different benefits and drawbacks to each decision.  

You can adopt any organization you wish.  We have some tips for organizing paths based on common practices.

## Each path in a separate file

Use a predefined "path separator" and keep all of your path files in the top level of the `paths` folder.

```
# todo: insert tree view of paths folder
```

Redocly recommends using the `@` character for this case.

In addition, Redocly recommends placing path parameters within `{}` curly braces if you adopt this style.

#### Motivations

* Quickly see a list of all paths.  Many people think in terms of the "number" of "endpoints" (paths), and not the "number" of "operations" (paths * http methods).

* Only the "file-per-path" option is semantically correct with the OpenAPI Specification 3.0.2.  However, Redocly's openapi-cli will build valid bundles for any of the other options too.


#### Drawbacks

* This may require multiple definitions per http method within a single file.
* It requires settling on a path separator (that is allowed to be used in filenames) and sticking to that convention.

## Each operation in a separate file

You may also place each operation in a separate file.  

In this case, if you want all paths at the top-level, you can concatenate the http method to the path name.  Similar to the above option, you can 

### Files at top-level of `paths`

You may name your files with some concatenation for the http method. For example, following a convention such as: `<path with allowed separator>-<http-method>.yaml`.

#### Motivations

* Quickly see all operations without needing to navigate subfolders.

#### Drawbacks

* Adopting an unusual path separator convention, instead of using subfolders.

### Use subfolders to mirror API path structure

Example:
```
GET /customers

/paths/customers/get.yaml
```

In this case, the path id defined within subfolders which mirror the API URL structure.

Example with path parameter:
```
GET /customers/{id}

/paths/customers/{id}/get.yaml
```

#### Motivations

It matches the URL structure.

It is pretty easy to reference:

```yaml
paths:
  '/customers/{id}':
    get:
      $ref: ./paths/customers/{id}/get.yaml
    put:
      $ref: ./paths/customers/{id}/put.yaml
```

#### Drawbacks

If you have a lot of nested folders, it may be confusing to reference your schemas.  

Example
```
file: /paths/customers/{id}/timeline/{messageId}/get.yaml

# excerpt of file
    headers:
      Rate-Limit-Remaining: 
        $ref: ../../../../../components/headers/Rate-Limit-Remaining.yaml

```
Notice the `../../../../../` in the ref which requires some attention to formulate correctly.  While openapi-cli has a linter which suggests possible refs when there is a mistake, this is still a net drawback for APIs with deep paths.