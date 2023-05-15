# Enable "Inspect ES queries"

APM UI performs Elasticsearch queries under the hood. During development and while debugging production issues it can be useful to see the exact queries being sent to Elasticsearch and what Elasticsearch responds back. 

To enable this follow these steps:

1. Open APM UI
2. Click "Settings" (top right corner)
3. Click "General Settings" tab
4. Enable "Inspect ES queries" and click "Save"

You should now be able to navigate to any page in APM UI, and see a new button in the top-right corner called "Inspect". Clicking this will open a fly-out listing all the requests made to Elasticsearch.

![apm-inspect2](https://github.com/elastic/kibana/assets/209966/ba5ebad9-cecc-4ed8-b6c6-9ffc0ce14c6d)
