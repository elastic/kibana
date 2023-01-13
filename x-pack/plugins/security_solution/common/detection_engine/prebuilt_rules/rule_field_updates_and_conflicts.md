**Epic:** https://github.com/elastic/security-team/issues/1974 (internal)

## Summary

This "PR" provides some examples we could use as a foundation for discussing and designing the UI for showing rule field diffs and resolving conflicts.

First, it describes six typical situations we can have for any rule field.

Then, it expands on how each of these six situations can look like for the following fields:

- rule name
- rule tags
- data source: index patterns or data view
- rule query

NOTE: You can comment this PR description line-by-line in `security_solution/common/detection_engine/prebuilt_rules/rule_field_updates_and_conflicts.md`.

There's no intention to merge this PR.

## Typical situations

Given a rule that can be upgraded, for every top-level field of this rule, we will have 3 versions of the field:

- **Base version**: the original stock version of the field shipped by Elastic and installed by the user.
- **Current version**: the version currently installed, potentially with user’s customizations.
  - If the user didn't customize this field, current == base.
  - If the field was customized, current != base.
- **Target version**: the latest stock version of the field shipped by Elastic and available for upgrade.

Using the above 3 versions, the app will attempt to automatically merge them into the final **Merged version**. The merge can either succeed, or fail with a **conflict**. Users will have to resolve conflicts manually in the UI. This automatic merge is supposed to improve the UX by reducing the amount of work our users will have to do during rule upgrade.

Here are six typical situations that we will have to handle in the app:

1. **`base=A, current=A, target=A => merged=A, conflict=false`**
    - **Situation**: Stock rule was installed. The user didn't customize the field. Elastic doesn't have any updates for this field.
    - **How to handle**: ❓ Don't show the field in the upgrade flyout?
2. **`base=A, current=A, target=B => merged=B, conflict=false`**
    - **Situation**: Stock rule was installed. The user didn't customize the field. Elastic updated this field in the latest version.
    - **How to handle**: Show this field in the flyout. Automatically pick the updated version from Elastic as the merged one.
3. **`base=A, current=B, target=A => merged=B, conflict=false`**
    - **Situation**: Stock rule was installed. The user customized the field. Elastic doesn't have any updates for this field.
    - **How to handle**: ❓ Don't show the field in the upgrade flyout? Or show the field, and automatically pick the current customized version as the merged one?
4. **`base=A, current=B, target=B => merged=B, conflict=false`**
    - **Situation**: Stock rule was installed. The user customized the field. Elastic updated this field in the latest version to exactly the same value as the user did it in their cluster.
    - **How to handle**: ❓ Don't show the field in the upgrade flyout?
5. **`base=A, current=B, target=C => merged=D, conflict=false`**
    - **Situation**: Stock rule was installed. The user customized the field. Elastic updated this field in the latest version. The customized version and the Elastic's version are different. The app was able to automatically merge them into a new version without conflict.
    - **How to handle**: ❓ Show this field in the flyout. Let the user see all the 4 versions if they want. Automatically pick the merged version. Don't show it as a conflict. Maybe highlight that the field was auto-merged (user might want to review and fix the merged version)?
6. **`base=A, current=B, target=C => merged=C, conflict=true`**
    - **Situation**: Stock rule was installed. The user customized the field. Elastic updated this field in the latest version. The customized version and the Elastic's version are different. The app was not able to automatically merge them into a new version because of a conflict.
    - **How to handle**: ❓ Show this field in the flyout. Let the user see all the 4 versions if they want. Automatically pick the target (or current?) version. Show it as a conflict at the top of the flyout.

Let's review these situations by example, using a few different fields.

## Rule name

Rule name is one of the most simple fields to reason about: it's a one-line string.

1. `base=A, current=A, target=A => merged=A, conflict=false`
    ```
    A = 'GCP Storage Bucket Deletion'
    ```

2. `base=A, current=A, target=B => merged=B, conflict=false`
    ```
    A = 'GCP Storage Bucket Deletion'
    B = 'Google Cloud Storage Bucket Deletion'
    ```

3. `base=A, current=B, target=A => merged=B, conflict=false`
    ```
    A = 'GCP Storage Bucket Deletion'
    B = 'GCP Storage Bucket Deletion (Critical Backups)'
    ```

4. `base=A, current=B, target=B => merged=B, conflict=false`
    ```
    A = 'GCP Storage Bucket Deletion'
    B = 'Google Cloud Storage Bucket Deletion'
    ```

5. `base=A, current=B, target=C => merged=D, conflict=false`
    ```
    If A != B != C, it should probably always be a conflict.
    See below.
    ```

6. `base=A, current=B, target=C => merged=C, conflict=true`
    ```
    A = 'GCP Storage Bucket Deletion'
    B = 'GCP Storage Bucket Deletion (Critical Backups)'
    C = 'Google Cloud Storage Bucket Deletion'
    
    Notice how the B implies that the user has likely narrowed down the query to something more
    specific to their cloud environment. Auto-merging into C w/o a conflict would mean obscuring
    the change in the query which is no longer generic and is not consistent with C.
    
    Technically, in this case we might be able to auto-merge into this:
    D = 'Google Cloud Storage Bucket Deletion (Critical Backups)'
    
    However in general, the problem with that is we can't guarantee that any technical auto-merge
    won't break the consistency with changes in other rule fields.
    ```

## Rule tags

The tags field is a slightly more complex field than the rule name, because it's an array of simple single-line strings. This gives us an opportunity to auto-merge changes in it.

1. `base=A, current=A, target=A => merged=A, conflict=false`
    ```
    A = ['Elastic', 'Cloud', 'GCP']
    ```

2. `base=A, current=A, target=B => merged=B, conflict=false`
    ```
    A = ['Elastic', 'Cloud', 'GCP']
    B = ['Elastic', 'Cloud', 'GCP', 'SecOps']
    ```

3. `base=A, current=B, target=A => merged=B, conflict=false`
    ```
    A = ['Elastic', 'Cloud', 'GCP']
    B = ['Elastic', 'Cloud', 'GCP', 'Critical Backups']
    ```

4. `base=A, current=B, target=B => merged=B, conflict=false`
    ```
    A = ['Elastic', 'Cloud', 'GCP']
    B = ['Elastic', 'Cloud', 'GCP', 'SecOps']
    ```

5. `base=A, current=B, target=C => merged=D, conflict=false`
   
    ```
    Example 1:
    A = ['Elastic', 'Cloud', 'GCP']
    B = ['Elastic', 'Cloud', 'GCP', 'Critical Backups']
    C = ['Elastic', 'Cloud', 'GCP', 'SecOps']
    D = ['Elastic', 'Cloud', 'GCP', 'SecOps', 'Critical Backups']
    
    Example 2:
    A = ['Elastic', 'Cloud', 'GCP']
    B = ['Cloud', 'SecOps', 'Critical Backups']
    C = ['Elastic', 'Cloud', 'Google Cloud', 'SecOps']
    D = ['Cloud', 'Google Cloud', 'SecOps', 'Critical Backups']
    ```
    
6. `base=A, current=B, target=C => merged=C, conflict=true`
    ```
    If A != B != C, it should always be possible to merge them without a conflict.
    ```

## Data source: index patterns or data view

Data source is an object that can represent two different types of sources:
- An array of index patterns. Each pattern is a simple single-line string.
    ```
    {
      type: 'index_patterns',
      index_patterns: ['filebeat-*', 'logs-*']
    }
    ```
- A data view stored in Kibana and referenced from the rule by its ID.
    ```
    {
      type: 'data_view',
      data_view_id: 'logs-*'
    }
    ```

<img width="987" alt="Screenshot 2023-01-13 at 19 16 32" src="https://user-images.githubusercontent.com/7359339/212394961-cea47d2a-f7ba-4300-a316-5ac032322875.png">

<img width="985" alt="Screenshot 2023-01-13 at 19 16 48" src="https://user-images.githubusercontent.com/7359339/212394998-82d5ee5a-0c2f-4ad8-8d27-c2e9711b5a49.png">

Examples of situations:

1. `base=A, current=A, target=A => merged=A, conflict=false`
    ```
    A = {
      type: 'index_patterns',
      index_patterns: ['filebeat-*', 'logs-*']
    }
    ```

2. `base=A, current=A, target=B => merged=B, conflict=false`
    ```
    A = {
      type: 'index_patterns',
      index_patterns: ['filebeat-*', 'logs-*']
    }
    B = {
      type: 'index_patterns',
      index_patterns: ['filebeat-*', 'logs-*', '-*elastic-cloud-logs-*']
    }
    ```

3. `base=A, current=B, target=A => merged=B, conflict=false`
    ```
    A = {
      type: 'index_patterns',
      index_patterns: ['filebeat-*', 'logs-*']
    }
    B = {
      type: 'data_view',
      data_view_id: 'logs-*'
    }
    ```

4. `base=A, current=B, target=B => merged=B, conflict=false`
    ```
    A = {
      type: 'index_patterns',
      index_patterns: ['filebeat-*', 'logs-*']
    }
    B = {
      type: 'index_patterns',
      index_patterns: ['filebeat-*', 'logs-*', 'winlogbeat-*']
    }
    ```

5. `base=A, current=B, target=C => merged=D, conflict=false`
    ```
    Example 1 (user added their Cross-Cluster Search index patterns, Elastic added a new pattern):
    A = {
      type: 'index_patterns',
      index_patterns: ['filebeat-*', 'logs-*']
    }
    B = {
      type: 'index_patterns',
      index_patterns: ['filebeat-*', 'logs-*', 'remote_cluster:filebeat-*', 'remote_cluster:logs-*']
    }
    C = {
      type: 'index_patterns',
      index_patterns: ['filebeat-*', 'logs-*', '-*elastic-cloud-logs-*']
    }
    D = {
      type: 'index_patterns',
      index_patterns: ['filebeat-*', 'logs-*', 'remote_cluster:filebeat-*', 'remote_cluster:logs-*', '-*elastic-cloud-logs-*']
    }
    
    Example 2 (user replaced index patterns with their own Cross-Cluster Search patterns,
    Elastic made them more specific + added a new one):
    A = {
      type: 'index_patterns',
      index_patterns: ['filebeat-*', 'logs-*']
    }
    B = {
      type: 'index_patterns',
      index_patterns: ['remote_cluster:filebeat-*', 'remote_cluster:logs-*']
    }
    C = {
      type: 'index_patterns',
      index_patterns: ['filebeat-*', 'logs-gcp-*', '-*elastic-cloud-logs-*']
    }
    D = {
      type: 'index_patterns',
      index_patterns: ['remote_cluster:filebeat-*', 'remote_cluster:logs-*', 'logs-gcp-*', '-*elastic-cloud-logs-*']
    }
    ```

6. `base=A, current=B, target=C => merged=C, conflict=true`
    ```
    A = {
      type: 'index_patterns',
      index_patterns: ['filebeat-*', 'logs-*']
    }
    B = {
      type: 'data_view',
      data_view_id: 'logs-*'
    }
    C = {
      type: 'index_patterns',
      index_patterns: ['filebeat-*', 'logs-gcp-*', '-*elastic-cloud-logs-*']
    }
    ```

## Query

Rule query is a complex object that can represent two different types of queries:
- Inline query. Stored in the rule:
    ```
    {
      type: 'inline_query',
      query: 'host.name:*',
      language: 'kuery',
      filters: [{...}, {...}]
    }
    ```
- Saved query. Stored as a separate object in Kibana and can be shared between multiple rules and reused in other places in Kibana:
    ```
    {
      type: 'saved_query',
      saved_query_id: 'a3a74be0-936a-11ed-b5ba-97720cfe8cbc'
    }
    ```

<img width="932" alt="Screenshot 2023-01-13 at 18 42 52" src="https://user-images.githubusercontent.com/7359339/212395165-4e515b84-b6b3-43ee-b061-d70e19be5f4a.png">

<img width="990" alt="Screenshot 2023-01-13 at 19 15 34" src="https://user-images.githubusercontent.com/7359339/212395243-0f46d4b3-3ebc-45ef-98b4-c399df2ba96c.png">

Examples of situations:

1. `base=A, current=A, target=A => merged=A, conflict=false`
    ```
    A = {
      type: 'inline_query',
      query: 'host.name:*',
      language: 'kuery',
      filters: []
    }
    ```

2. `base=A, current=A, target=B => merged=B, conflict=false`
    ```
    A = {
      type: 'inline_query',
      query: 'host.name:*',
      language: 'kuery',
      filters: []
    }
    B = {
      type: 'inline_query',
      query: 'host.name:* and event.kind:alert',
      language: 'kuery',
      filters: []
    }
    ```

3. `base=A, current=B, target=A => merged=B, conflict=false`
    ```
    A = {
      type: 'inline_query',
      query: 'host.name:*',
      language: 'kuery',
      filters: []
    }
    B = {
      type: 'inline_query',
      query: 'host.name:*',
      language: 'kuery',
      filters: [
        {
          meta: {
            alias: 'Not Windows or Linux',
            type: 'combined',
            relation: 'AND',
            params: [
              { query: {...}, meta: {...} },
              { query: {...}, meta: {...} },
            ]
          }
        }
      ]
    }
    ```

4. `base=A, current=B, target=B => merged=B, conflict=false`
    ```
    A = {
      type: 'inline_query',
      query: 'host.name:*',
      language: 'kuery',
      filters: []
    }
    B = {
      type: 'inline_query',
      query: 'host.name:* and event.kind:alert',
      language: 'kuery',
      filters: []
    }
    ```

5. `base=A, current=B, target=C => merged=D, conflict=false`
    ```
    A = {
      type: 'inline_query',
      query: 'host.name:*',
      language: 'kuery',
      filters: []
    }
    B = {
      type: 'inline_query',
      query: 'host.name:*',
      language: 'kuery',
      filters: [
        {
          meta: {
            alias: 'Not Windows or Linux',
            type: 'combined',
            relation: 'AND',
            params: [
              { query: {...}, meta: {...} },
              { query: {...}, meta: {...} },
            ]
          }
        }
      ]
    }
    C = {
      type: 'inline_query',
      query: 'host.name:* and event.kind:alert',
      language: 'kuery',
      filters: []
    }
    D = {
      type: 'inline_query',
      query: 'host.name:* and event.kind:alert',
      language: 'kuery',
      filters: [
        {
          meta: {
            alias: 'Not Windows or Linux',
            type: 'combined',
            relation: 'AND',
            params: [
              { query: {...}, meta: {...} },
              { query: {...}, meta: {...} },
            ]
          }
        }
      ]
    }
    ```

6. `base=A, current=B, target=C => merged=C, conflict=true`
    ```
    Example 1:
    A = {
      type: 'inline_query',
      query: 'host.name:*',
      language: 'kuery',
      filters: []
    }
    B = {
      type: 'saved_query',
      saved_query_id: 'a3a74be0-936a-11ed-b5ba-97720cfe8cbc'
    }
    C = {
      type: 'inline_query',
      query: 'host.name:* and event.kind:alert',
      language: 'kuery',
      filters: []
    }
    
    Example 2:
    A = {
      type: 'inline_query',
      query: 'host.name:*',
      language: 'kuery',
      filters: []
    }
    B = {
      type: 'inline_query',
      query: 'host.name:* and event.category:network',
      language: 'kuery',
      filters: []
    }
    C = {
      type: 'inline_query',
      query: 'host.name:* and event.kind:alert',
      language: 'kuery',
      filters: []
    }
    
    Example 3:
    A = {
      type: 'inline_query',
      query: 'host.name:*',
      language: 'kuery',
      filters: []
    }
    B = {
      type: 'inline_query',
      query: 'host.name:*',
      language: 'lucene',
      filters: []
    }
    C = {
      type: 'inline_query',
      query: 'host.name:* and event.kind:alert',
      language: 'kuery',
      filters: []
    }
    
    Example 4:
    A = {
      type: 'inline_query',
      query: 'host.name:*',
      language: 'kuery',
      filters: []
    }
    B = {
      type: 'inline_query',
      query: 'host.name:*',
      language: 'kuery',
      filters: [
        {
          "meta": {
            "type": "combined",
            "relation": "AND",
            "params": [
              {
                "query": {
                  "match_phrase": {
                    "host.os.family": "windows"
                  }
                },
                "meta": {
                  "negate": true,
                  "key": "host.os.family",
                  "field": "host.os.family",
                  "params": {
                    "query": "windows"
                  },
                  "type": "phrase",
                  "disabled": false,
                  "alias": null
                }
              },
              {
                "meta": {
                  "negate": true,
                  "key": "host.os.family",
                  "field": "host.os.family",
                  "params": {
                    "query": "linux"
                  },
                  "type": "phrase",
                  "disabled": false,
                  "alias": null
                },
                "query": {
                  "match_phrase": {
                    "host.os.family": "linux"
                  }
                }
              }
            ],
            "disabled": false,
            "negate": false,
            "alias": "Not Windows or Linux"
          },
          "query": {},
          "$state": {
            "store": "appState"
          }
        }
      ]
    }
    C = {
      type: 'inline_query',
      query: 'host.name:*',
      language: 'kuery',
      filters: [
        {
          "$state": {
            "store": "appState"
          },
          "meta": {
            "type": "combined",
            "relation": "AND",
            "params": [
              {
                "query": {
                  "exists": {
                    "field": "source.ip"
                  }
                },
                "meta": {
                  "negate": false,
                  "key": "source.ip",
                  "field": "source.ip",
                  "value": "exists",
                  "type": "exists",
                  "disabled": false,
                  "alias": null
                }
              },
              {
                "meta": {
                  "negate": false,
                  "key": "destination.ip",
                  "field": "destination.ip",
                  "value": "exists",
                  "type": "exists",
                  "disabled": false,
                  "alias": null
                },
                "query": {
                  "exists": {
                    "field": "destination.ip"
                  }
                }
              }
            ],
            "disabled": false,
            "negate": false,
            "alias": null
          },
          "query": {}
        }
      ]
    }
    ```
