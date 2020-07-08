
### How to on board a new prepackage timelines:

1. [Have the env params set up](https://github.com/elastic/kibana/blob/master/x-pack/plugins/siem/server/lib/detection_engine/README.md)
2. Create a new timelines template into `x-pack/plugins/security_solution/server/lib/detection_engine/rules/prepackaged_timelines`
```
cd x-pack/plugins/security_solution/server/lib/detection_engine/rules/prepackaged_timelines

echo '{"savedObjectId":null,"version":null,"columns":[{"indexes":null,"name":null,"columnHeaderType":"not-filtered","id":"@timestamp","searchable":null},{"indexes":null,"name":null,"columnHeaderType":"not-filtered","id":"signal.rule.description","searchable":null},{"indexes":null,"name":null,"columnHeaderType":"not-filtered","id":"event.action","searchable":null},{"indexes":null,"name":null,"columnHeaderType":"not-filtered","id":"process.name","searchable":null},{"indexes":null,"aggregatable":true,"name":null,"description":"The working directory of the process.","columnHeaderType":"not-filtered","id":"process.working_directory","category":"process","type":"string","searchable":null,"example":"/home/alice"},{"indexes":null,"aggregatable":true,"name":null,"description":"Array of process arguments, starting with the absolute path to\nthe executable.\n\nMay be filtered to protect sensitive information.","columnHeaderType":"not-filtered","id":"process.args","category":"process","type":"string","searchable":null,"example":"[\"/usr/bin/ssh\",\"-l\",\"user\",\"10.0.0.16\"]"},{"indexes":null,"name":null,"columnHeaderType":"not-filtered","id":"process.pid","searchable":null},{"indexes":null,"aggregatable":true,"name":null,"description":"Absolute path to the process executable.","columnHeaderType":"not-filtered","id":"process.parent.executable","category":"process","type":"string","searchable":null,"example":"/usr/bin/ssh"},{"indexes":null,"aggregatable":true,"name":null,"description":"Array of process arguments.\n\nMay be filtered to protect sensitive information.","columnHeaderType":"not-filtered","id":"process.parent.args","category":"process","type":"string","searchable":null,"example":"[\"ssh\",\"-l\",\"user\",\"10.0.0.16\"]"},{"indexes":null,"aggregatable":true,"name":null,"description":"Process id.","columnHeaderType":"not-filtered","id":"process.parent.pid","category":"process","type":"number","searchable":null,"example":"4242"},{"indexes":null,"aggregatable":true,"name":null,"description":"Short name or login of the user.","columnHeaderType":"not-filtered","id":"user.name","category":"user","type":"string","searchable":null,"example":"albert"},{"indexes":null,"aggregatable":true,"name":null,"description":"Name of the host.\n\nIt can contain what `hostname` returns on Unix systems, the fully qualified\ndomain name, or a name specified by the user. The sender decides which value\nto use.","columnHeaderType":"not-filtered","id":"host.name","category":"host","type":"string","searchable":null}],"dataProviders":[{"excluded":false,"and":[],"kqlQuery":"","name":"590eb946a7fdbacaa587ed0f6b1a16f5ad3d659ec47ef35ad0826c47af133bde","queryMatch":{"displayValue":null,"field":"_id","displayField":null,"value":"590eb946a7fdbacaa587ed0f6b1a16f5ad3d659ec47ef35ad0826c47af133bde","operator":":"},"id":"send-signal-to-timeline-action-default-draggable-event-details-value-formatted-field-value-timeline-1-signal-id-590eb946a7fdbacaa587ed0f6b1a16f5ad3d659ec47ef35ad0826c47af133bde","enabled":true}],"description":"","eventType":"all","filters":[],"kqlMode":"filter","kqlQuery":{"filterQuery":{"kuery":{"kind":"kuery","expression":""},"serializedQuery":""}},"title":"Generic Process Timeline","dateRange":{"start":1588161020848,"end":1588162280848},"savedQueryId":null,"sort":{"columnId":"@timestamp","sortDirection":"desc"},"created":1588162404153,"createdBy":"Elastic","updated":1588604767818,"updatedBy":"Elastic","eventNotes":[],"globalNotes":[],"pinnedEventIds":[],"timelineType":"template","status":"immutable","templateTimelineId":"2c7e0663-5a91-0004-aa15-26bf756d2c40","templateTimelineVersion":1}' > my_new_template.json

```
2. ```cd x-pack/plugins/security_solution/server/lib/detection_engine/scripts```
3. ```sh ./run regen_prepackage_timelines_index.sh```
(this will update `x-pack/plugins/security_solution/server/lib/detection_engine/rules/prepackaged_timelines/index.ndjson`)

4. Go to `http://localhost:5601/app/security#/detections/rules` and click on `Install Elastic prebuild rules`
or run
```
sh add_prepackaged_timelines.sh
```

5.  Check in UI or run the script below to see if prepackaged timelines on-boarded correctly.
```
sh find_timeline_by_filter.sh immutable template elastic
```

### How to update an existing prepackage timeline:
1. ```cd x-pack/plugins/security_solution/server/lib/detection_engine/rules/prepackaged_timelines```
2. Open the json file you wish to update, and remember to bump the `templateTimelineVersion`
3. ```sh ./run regen_prepackage_timelines_index.sh```
4. Go to `http://localhost:5601/app/security#/detections/rules` and click on `Install Elastic prebuild rules`
or run
```
sh add_prepackaged_timelines.sh
```

5.  Check in UI or run the script below to see if the prepackaged timeline updated correctly.
```
sh find_timeline_by_filter.sh immutable template elastic
```


### How to install prepackaged timelines:
1.  ```cd x-pack/plugins/siem/server/lib/detection_engine/scripts```
2. ```sh ./run install_prepackage_timelines.sh```
3. ```sh find_timeline_by_filter.sh immutable template elastic```

### Delete all timelines:
```
cd x-pack/plugins/security_solution/server/lib/detection_engine/scripts

sh delete_all_timelines.sh
```

### Delete timeline by timeline id:
```
cd x-pack/plugins/security_solution/server/lib/detection_engine/scripts

./delete_all_alerts.sh {timeline_id}

```