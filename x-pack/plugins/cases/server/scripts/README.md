README.md for developers working on the Case API on how to get started
using the CURL scripts in the scripts folder.

The scripts rely on CURL and jq:

- [CURL](https://curl.haxx.se)
- [jq](https://stedolan.github.io/jq/)

Install curl and jq

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
export TASK_MANAGER_INDEX=.kibana-task-manager-${your user id}
export KIBANA_INDEX=.kibana-${your user id}
```

source `$HOME/.zshrc` or `${HOME}.bashrc` to ensure variables are set:

```sh
source ~/.zshrc
```

Restart Kibana and ensure that you are using `--no-base-path` as changing the base path is a feature but will
get in the way of the CURL scripts written as is. 

Go to the scripts folder `cd kibana/x-pack/plugins/cases/server/scripts` and run:

```sh
./hard_reset.sh
```

which will:

- Delete any existing cases you have
- Delete any existing comments you have
- Posts the sample case from `./mock/case/post_case.json`
- Posts the sample comment from `./mock/comment/post_comment.json` to the new case

Now you can run

```sh
./find_cases.sh
```

You should see the new case created like so:

```sh
{
  "page": 1,
  "per_page": 20,
  "total": 1,
  "cases": [
    {
      "id": "2e0afbc0-658c-11ea-85c8-1d8f792cbc08",
      "version": "Wzc5NSwxXQ==",
      "comments": [],
      "comment_ids": [
        "2ecec0f0-658c-11ea-85c8-1d8f792cbc08"
      ],
      "created_at": "2020-03-14T00:38:53.004Z",
      "created_by": {
        "full_name": "Steph Milovic",
        "username": "smilovic"
      },
      "updated_at": null,
      "updated_by": null,
      "description": "This looks not so good",
      "title": "Bad meanie defacing data",
      "status": "open",
      "tags": [
        "defacement"
      ]
    }
  ],
  "count_open_cases": 1,
  "count_closed_cases": 1
}
```
