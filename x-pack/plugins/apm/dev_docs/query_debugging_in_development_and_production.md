# Query Debugging

When debugging an issue with the APM UI it can be very helpful to see the exact Elasticsearch queries and responses that was made for a given API request. 
To enable debugging of Elasticsearch queries in APM UI do the following:

1. Go to "Stack Management" 
2. Under "Kibana" on the left-hand side, select "Advanced Settings"
3. Search for "Observability"
4. Enable "Inspect ES queries" setting
5. Click "Save"

When you navigate back to APM UI you can now inspect Elasticsearch queries by opening your browser's Developer Tools and selecting an api request to APM's api. 
There will be an `_inspect` key containing every Elasticsearch query made during that request including both requests and responses to and from Elasticsearch.

![image](https://user-images.githubusercontent.com/209966/140500012-b075adf0-8401-40fd-99f8-85b68711de17.png)


