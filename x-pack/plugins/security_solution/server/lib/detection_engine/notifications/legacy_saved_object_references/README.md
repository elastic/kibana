This is where you add code when you have rules which contain saved object references. Saved object references are for
when you have "joins" in the saved objects between one saved object and another one. This can be a 1 to M (1 to many)
relationship for example where you have a rule which contains the "id" of another saved object.

NOTE: This is the "legacy saved object references" and should only be for the "legacy_rules_notification_alert_type".
The legacy notification system is being phased out and deprecated in favor of using the newer alerting notification system.
It would be considered wrong to see additional code being added here at this point. However, maintenance should be expected
until we have all users moved away from the legacy system.


## How to create a legacy notification

* Create a rule and activate it normally within security_solution
* Do not add actions to the rule at this point as we are exercising the older legacy system. However, you want at least one action configured such as a slack notification.
* Within dev tools do a query for all your actions and grab one of the `_id` of them without their prefix:

```json
# See all your actions
GET .kibana/_search
{
  "query": {
    "term": {
      "type": "action"
    }
  }
}
```

Mine was `"_id" : "action:879e8ff0-1be1-11ec-a722-83da1c22a481"`, so I will be copying the ID of `879e8ff0-1be1-11ec-a722-83da1c22a481`

Go to the file `detection_engine/scripts/legacy_notifications/one_action.json` and add this id to the file. Something like this:

```json
{
  "name": "Legacy notification with one action",
  "interval": "1m",  <--- You can use whatever you want. Real values are "1h", "1d", "1w". I use "1m" for testing purposes.
  "actions": [
    {
      "id": "879e8ff0-1be1-11ec-a722-83da1c22a481", <--- My action id
      "group": "default",
      "params": {
        "message": "Hourly\nRule {{context.rule.name}} generated {{state.signals_count}} alerts"
      },
      "actionTypeId": ".slack" <--- I am a slack action id type.
    }
  ]
}
```

Query for an alert you want to add manually add back a legacy notification to it. Such as:

```json
# See all your siem.signals alert types and choose one
GET .kibana/_search
{
  "query": {
    "term": {
      "alert.alertTypeId": "siem.signals"
    }
  }
}
```

Grab the `_id` without the alert prefix. For mine this was `933ca720-1be1-11ec-a722-83da1c22a481`

Within the directory of detection_engine/scripts execute the script:

```json
./post_legacy_notification.sh 933ca720-1be1-11ec-a722-83da1c22a481
{
  "ok": "acknowledged"
}
```

which is going to do a few things. See the file `detection_engine/routes/rules/legacy_create_legacy_notification.ts` for the definition of the route and what it does in full, but we should notice that we have now:

Created a legacy side car action object of type `siem-detection-engine-rule-actions` you can see in dev tools:

```json
# See the actions "side car" which are part of the legacy notification system.
GET .kibana/_search
{
  "query": {
    "term": {
      "type": {
        "value": "siem-detection-engine-rule-actions"
      }
    }
  }
}
```

But more importantly what the saved object references are which should be this:

```json
# Get the alert type of "siem-notifications" which is part of the legacy system.
GET .kibana/_search
{
  "query": {
    "term": {
      "alert.alertTypeId": "siem.notifications"
    }
  }
}
```

I omit parts but leave the important parts pre-migration and post-migration of the Saved Object.

```json
"data..omitted": "data..omitted",
"params" : {
  "ruleAlertId" : "933ca720-1be1-11ec-a722-83da1c22a481" <-- Pre-migration we had this Saved Object ID which is not part of references array below
},
"actions" : [
  {
    "group" : "default",
    "params" : {
      "message" : "Hourly\nRule {{context.rule.name}} generated {{state.signals_count}} alerts"
    },
    "actionTypeId" : ".slack",
    "actionRef" : "action_0" <-- Pre-migration this is correct as this work is already done within the alerting plugin
  },
  "references" : [
    {
      "id" : "879e8ff0-1be1-11ec-a722-83da1c22a481",
      "name" : "action_0", <-- Pre-migration this is correct as this work is already done within the alerting plugin
      "type" : "action"
    }
  ]
],
"data..omitted": "data..omitted",
```

Post migration this structure should look like this after Kibana has started and finished the migration.

```json
"data..omitted": "data..omitted",
"params" : {
  "ruleAlertId" : "933ca720-1be1-11ec-a722-83da1c22a481" <-- Post-migration this structure is on disk but is no longer preferred. Instead this ID is serialized from references.
},
"actions" : [
  {
    "group" : "default",
    "params" : {
      "message" : "Hourly\nRule {{context.rule.name}} generated {{state.signals_count}} alerts"
    },
    "actionTypeId" : ".slack",
    "actionRef" : "action_0"
  },
  "references" : [
    {
      "id" : "879e8ff0-1be1-11ec-a722-83da1c22a481",
      "name" : "action_0",
      "type" : "action"
    },
    {
      "id" : "933ca720-1be1-11ec-a722-83da1c22a481", <-- Our id here is preferred and used.
      "name" : "rule_0", <-- We add the name of our reference which is rule_0
      "type" : "rule" <-- We add the type which is type of rule to the references
    }
  ]
],
"data..omitted": "data..omitted",
```

Only if for some reason a migration has failed due to a bug would we fallback and try to use `"ruleAlertId" : "933ca720-1be1-11ec-a722-83da1c22a481"`, otherwise all access will come from the 
references array's version. If the migration fails or the fallback to `"ruleAlertId" : "933ca720-1be1-11ec-a722-83da1c22a481"` does happen, then the code emits several error messages to the
user which should further encourage the user to help migrate the legacy notification system to the newer notification system.


## Useful queries

```json
# Get the alert type of "siem-notifications" which is part of the legacy system.
GET .kibana/_search
{
  "query": {
    "term": {
      "alert.alertTypeId": "siem.notifications"
    }
  }
}
```
