## Instructions for loading & observing data 

There are several steps required to set up geo threshold alerts for testing in a way
that allows you to view triggered alerts as they happen. These instructions outline
how to load test data, but really these steps can be used to load any data for geo
threshold alerts so long as you have the following data:
- An index containing `geo_shape` data, such as boundary data, bounding box data, etc.
This data is presumed to be static (not updated). Shape data matching the query is
harvested once when the alert is created and anytime after when alert is re-enabled
after disablement
- An index containing a`geo_point` field and a `date` field. This data is presumed to
be dynamic (updated).
The ability for threshold alerts to monitor data requires there be somewhat "real time"
data streaming in as indicated by the `date` field. Older locations determined by `date`
are compared with newer locations to determine if a boundary has been crossed in the
current monitoring interval.

### 1. Run ES/Kibana dev env with https enabled
- In two terminals, run the normal commands to launch both elasticsearch and kibana but 
append `--ssl` to the end of each as an arg, i.e.:
  - `yarn es snapshot --ssl  // Runs Elasticsearch`
  - `yarn start --ssl // Runs Kibana`
  
### 2. Get an MTA data api key
- You'll need to obtain an NYC MTA api key, you can request this
  key [here](https://docs.google.com/forms/d/e/1FAIpQLSfGUZA6h4eHd2-ImaK5Q_I5Gb7C3UEP5vYDALyGd7r3h08YKg/viewform?hl=en&formkey=dG9kcGIxRFpSS0NhQWM4UjA0V0VkNGc6MQ#gid=0)

### 3. Get trackable point data (MTA bus data) into elasticsearch
- You'll be using the script: `https://github.com/thomasneirynck/mtatracks` to harvest
live bus data to populate the system. Clone the repo and follow the instructions in
the readme to set up. 
- Using the MTA key you obtained in the previous step, the final command to run
in a local terminal should look something like:
`node ./load_tracks.js -a <YOUR_API_KEY>`

### 4. Open required Kibana tabs
There are 4 separate tabs you'll need for a combination of loading and viewing the
data. Since you'll be jumping between them, it might be easiest to just open them
upfront. Each is preceded by `https://localhost:5601/<your dev env prefix>/app/`:
- Index Patterns: `management/kibana/indexPatterns`
- Alerts & Actions: `management/insightsAndAlerting/triggersActions/alerts`
- Dev tools: `dev_tools#/console`
- Maps: `maps`

### 5. Create a new alert index in dev tools
Execute the following two commands:
- Create index
```
PUT /manhattan_mta_alerts
```
- Create mappings
```
PUT /manhattan_mta_alerts/_mapping
{
  "properties": {
    "AlertInstanceId": {
      "type": "keyword"
    },
    "CrossingEventTimestamp": {
      "type": "date"
    },
    "CurrentBoundaryId": {
      "type": "keyword"
    },
    "CurrentLocation": {
      "type": "geo_point"
    },
    "PreviousBoundaryId": {
      "type": "keyword"
    },
    "PreviousLocation": {
      "type": "geo_point"
    }
  }
}
```

### 6 Start the map to index the boundaries
- Go to the Maps app
- Create a new map
- Using GeoJSON Upload, upload the geojson located in the folder of the previously 
cloned `mta_tracks` repo: `nyc-neighborhoods.geo.json`. Accept all of the default
settings.
_ When finished uploading and adding the layer, save the map using a name of your
choice.
- Keep the Maps tab open, you'll come back to this

### 7. Create index pattern for generated tracks
- Go to the index pattern tab to create a new index pattern
- Set time field to default
- Repeat for new index pattern: `tracks`
- Leave tab open, you'll come back to this

### 8. Create threshold alert
- Go to `Stack management` > `Alerts & Actions` > `Create Alert` > `Tracking threshold`
- Fill out top and middle sections. _Should_ flow somewhat logically. Do set both 
`Check every` and `Notify every` to `2 seconds`
- Create index connector (any name is fine). For index name, use the one we created 
earlier in dev tools: `manhattan_mta_alerts`
- For document structure, use:
```
{
    "AlertInstanceId": "{{alertInstanceId}}",
    "CrossingEventTimestamp": "{{context.crossingEventTimeStamp}}",
    "CurrentBoundaryId": "{{context.currentBoundaryId}}",
    "CurrentLocation": "{{context.currentLocation}}",
    "PreviousBoundaryId": "{{context.previousBoundaryId}}",
    "PreviousLocation": "{{context.previousLocation}}"
}
```

### 9. Create another index pattern to track on maps for indexed alert data
- Go to Stack Management > Index Patterns
- Create new index pattern: `manhattan_mta_alerts`

### 10. Create Map
- You should already have the boundaries layer from the GeoJson upload earlier
- Do top hits (quantity: 1) on the generate tracks script output docs (index: `tracks`). Set sorting on timestamp descending
- Create another doc layer for the alerting index (not top hits) (manhattan_index_alerts: current location)
- On time picker set: `Last 30 seconds, <Apply>` and `Refresh every: 2 seconds, <start>`
