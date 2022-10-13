
# Steps to generate Lens attributes:
All the files in the folder were exported from Lens. These Lens attributes allow the charts implemented by Security Solution (Not with Lens Embeddable) on Host and Network pages to share across the app.


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

