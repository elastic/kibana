
# Steps to generate Lens attributes:
All the files in the folder were exported from Lens. These Lens attributes allow the charts to be opened in Lens and rendering KPIs on Hosts, Network, and users page.


Here are the steps of how to generate them:

1. Launch Kibana, go to `Visualize Library`, `Create visualization`, and select `Lens` to enter the editor.
2. Create the visualization and save it.
3. Go to `Stack Management` > `Saved Objects`, tick the box of the visualization you just created, and click `Export`
4. Create a new file in this folder with the attributes below from the exported file:
    - description
    - state
    - title
    - visualizationType
    - references

    Note: `id` under `references` will eventually be replaced according to selected data view id on Security Solution's page

5. Add `state.visualization.autoScaleMetricAlignment: left` if the visualizationType is `lnsLegacyMetric` and it has no icon and description on the UI. (example: kpi_dns_queries)

6. Put references.id as `{dataViewId}` if the reference type is `index-pattern`. The dataViewId will be replaced by dataViewId from sourcerer.

