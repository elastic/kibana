## Instructions for loading & observing data 

There are several steps required to set up geo containment alerts for testing in a way
that allows you to view triggered alerts as they happen. These instructions outline
how to load test data, but really these steps can be used to load any data for geo
containment alerts so long as you have the following data:
- An index containing a`geo_point` field and a `date` field. This data is presumed to
be dynamic (updated).
- An index containing `geo_shape` data, such as boundary data, bounding box data, etc.
This data is presumed to be static (not updated). Shape data matching the query is
harvested once when the alert is created and anytime after when alert is re-enabled
after disablement
The ability for containment alerts to monitor data requires there be somewhat "real time"
data streaming in as indicated by the `date` field.

### 1. Set experimental flag to enable containment alerts
- Your `kibana.yml` config file is located in the `config/` dir in the base of your kibana
project. To edit it, open this file in your editor of choice, add the line described in
the next step to the bottom of the file (or really anywhere) and save. For more details
on different config modifications or on how to make production config modifications,
see [the current docs](https://www.elastic.co/guide/en/kibana/current/settings.html)

### 2. Run ES/Kibana dev env with ssl enabled
- In two terminals, run the normal commands to launch both elasticsearch and kibana but 
append `--ssl` to the end of each as an arg, i.e.:
  - `yarn es snapshot --ssl  # Runs Elasticsearch`
  - `yarn start --ssl # Runs Kibana`
  
### 3. Get an MTA data api key
- You'll need to obtain an NYC MTA api key, you can request this
  key [here](https://docs.google.com/forms/d/e/1FAIpQLSfGUZA6h4eHd2-ImaK5Q_I5Gb7C3UEP5vYDALyGd7r3h08YKg/viewform?hl=en&formkey=dG9kcGIxRFpSS0NhQWM4UjA0V0VkNGc6MQ#gid=0)

### 4. Get trackable point data (MTA bus data) into elasticsearch
- You'll be using the script: `https://github.com/thomasneirynck/mtatracks` to harvest
live bus data to populate the system. Clone the repo and follow the instructions in
the readme to set up. 
- Using the MTA key you obtained in the previous step, the final command to run
in a local terminal should look something like the following. This script loads large
quantities of data the frequency listed below (20000ms = 20s) or higher:
`node ./load_tracks.js -a <YOUR_API_KEY> -f 20000`

### 5. Open required Kibana tabs
There are 3 separate tabs you'll need for a combination of loading and viewing the
data. Since you'll be jumping between them, it might be easiest to just open them
upfront. Each is preceded by `https://localhost:5601/<your dev env prefix>/app/`:
- Stack Management > Index Patterns: `management/kibana/indexPatterns`
- Stack Management > Alerts & Actions: `management/insightsAndAlerting/triggersActions/alerts`
- Maps: `maps`

### 6 Create map to monitor alerts
- Go to the Maps app and create a new map
- Using GeoJSON Upload, upload the GeoJSON file located in the folder of the previously 
cloned `mta_tracks` repo: `nyc-neighborhoods.geo.json`. Accept all of the default
settings and add the layer.
- You may want to click your newly added layer and select "Fit to data" so you can see the
boundaries you've added.
_ When finished uploading and adding the layer, save the map using a name of your
choice.
- Keep the Maps tab open, you'll come back to this

### 7. Create index pattern for generated tracks
- Go to the index pattern tab to create a new index pattern.
- Give it the index name `mtatracks*`
- For `Time field` select `@timestamp`
- Click `Create index pattern`
- Leave this tab open, you'll come back to this

### 8. Create containment alert
- Go to the Alerts tab and click `Create Alert` > `Tracking containment`
- Fill the side bar form top to bottom. This _should_ flow somewhat logically. In the top 
section, set both `Check every` and `Notify every` to `1 minute`.
 For `Notify`, leave
on default selected option `Only on status change`, this will notify only on newly
contained entities.
 **Please note that `2 seconds` is an unusually quick interval but done here for demo
 purposes. With real world data, setting an appropriate interval speed is highly dependent
 upon the quantity, update frequency and complexity of data handled.**
- The default settings for `Select Entity` will mostly be correct. Select `mta_tracks*`
as the index you'd like to track. Use the defaults populated under
`Select entity` > `INDEX`, update `Select entity` > `BY` to `vehicle_ref`.
- For `Select boundary` > `INDEX`, select `nyc-neighborhoods` and all populated defaults.
- Under `Actions`, create an `Server log` action, then create a `Connector` which you can simply name
`Log test`.
- For `Run when`, the default `Tracking containment met` will work here. This will track
only points that are newly contained in the boundaries.
- Leave the log level at `Info`
- For the message, use the following sample message or one of your own:
```
Entity: {{context.entityId}} with document ID: {{context.entityDocumentId}} has been recorded at location: {{context.entityLocation}} in boundary: {{context.containingBoundaryName}}({{context.containingBoundaryId}}) at {{context.entityDateTime}}. This was detected by the alerting framework at: {{context.detectionDateTime}}. 
```
- At the bottom right, click `Save`. Your alert should now be created!
- You should now be able to see alerts generated in your Kibana console log.

### 9. Visually confirm your alerts with Maps
- Creating layers
  - Using the source data below, you can create the following layers:
      - Boundary data (`nyc-neighborhoods`)
        - Boundary layer
      - Original tracks data (`mtatracks*`)
        - Last known location
        - Geo-line track
  - Boundary layer
    - This layer should already be added from when you uploaded the GeoJSON
      file earlier. If it's not already added, it can be added by selecting `Documents`
      > `Index patterns` > `nyc-neighborhoods` then accept the defaults and add the layer. 
  - Vehicle tracks
    - Add `Tracks` > `Index patterns` > `mtatracks*`, accept the defaults selected and set `Entity` > `entity_id`. Add the layer and style appropriately.
  - Last known location
    - Add `Documents` > `Index patterns` > `mtatracks*` and select `Show top hits per entity`
    - For `Entity` select `entity_id` and add the layer. 
    - The only required setting on the following screen is to set `Sorting` to sort on `@timestamp`
- Update time scope of data
  - Changing the refresh rate `Refresh every`: `4 seconds` keeps the layers updated and in particular
  shows the latest values obtained in the `Top hits` layer
  - The time picker should already be set to the default `15 minutes`, this is a good default but
  can be adjusted up or down to see more or less data respectively
- General tips  
    - Style layers with contrasting colors to clearly see each
    - Consider using icons for the `Top hits` vehicle movement layer
    - Consider adding tooltips to layers to better understand the data in your layers.
    - Save your Map anytime you've made any layer adjustments
