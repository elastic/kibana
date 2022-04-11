# Sourcerer API

### Model reference

```typescript
interface KibanaDataView {
  /** Uniquely identifies a Kibana Data View */
  id: string;
  /**  list of active patterns that return data  */
  patternList: string[];
  /**
   * title of Kibana Data View
   * title also serves as "all pattern list", including inactive
   * comma separated string
   */
  title: string;
}
```

### API usage

The sourcerer API has one route with 2 methods

1. POST - `createSourcererDataViewRoute`
   1. REQUEST:
       ```typescript
         POST /internal/security_solution/sourcerer
         {
           patternList: [...configPatternList, ...(signal.name != null ? [signal.name] : [])]
         }
         ```
   2. RESPONSE:
       ```typescript
         {
             /** default security-solution data view */
             defaultDataView: KibanaDataView;

             /** all Kibana data views, including default security-solution */
             kibanaDataViews: KibanaDataView[];
          }
          ```
   3. This route is called from `security_solution/public/plugin.tsx` on app load. It passes an argument of `patternList` which is an array of the config index patterns defined in Stack Management > Advanced Settings > Security Solution > Elasticsearch indices along with the default signal index
   4. `dataViewService.getIdsWithTitle` is called to get all existing data views ids and titles
   5. Next `dataViewService.get` method is called to attempt to retrieve the default security data view by id (`siemClient.getSourcererDataViewId()`). If the data view id does not exist, it uses `dataViewService.createAndSave` to create the default security data view. 
   6. `patternListAsTitle` (a string of the patternList passed) is compared to the current `siemDataViewTitle`. If they do not match, we use `dataViewService.updateSavedObject` to update the data view title. This may happen when a pattern is added or removed from the Stack Management > Advanced Settings > Security Solution > Elasticsearch indices.
   7. Next we call `buildSourcererDataView` for the default data view only. This takes the `dataView.title` and finds which patterns on the list returns data. Valid patterns are returned in an array called `patternList`. The non-default data views will have an empty array for patternList, and we will call this function if/when the data view is selected to save time.
2. At the end we return a body of 
   ```
     {
        /** default security-solution data view */
        defaultDataView: KibanaDataView;
      
        /** all Kibana data views, including default security-solution */
        kibanaDataViews: KibanaDataView[];
     }
     ```
   1. The other place this POST is called is when the default signal index does not yet exist. In the front-end there is a method called `pollForSignalIndex` that is defined when the signal index has been initiated but does not have data. It is called whenever the detection sourcerer or timeline sourcerer mounts, or whenever the search bar is refreshed. If the signal index is defined, `pollForSignalIndex` ceases to exist and is not called.
   2. One more place we call the POST method is when the signal index first has data, we send a POST in a method called `onSignalIndexUpdated` to include the newly created index in the data view
3. GET - `getSourcererDataViewRoute`
   1. REQUEST:
       ```typescript
         GET /internal/security_solution/sourcerer?dataViewId=security-solution-default
         ```
   2. RESPONSE:
       ```typescript
         KibanaDataView
       ```
4. When the user changes the data view from the default in the UI, we call the GET method to find which index patterns in the `dataView.title` are valid, returning a valid `patternList`. 
5. We return a body of a single `KibanaDataView`

### Helpers
To build the valid pattern list, we call `findExistingIndices` which takes the pattern list as an argument, and returns a boolean array of which patterns are valid. To check if indices exist, we use the field caps API for each pattern checking for the field `_id`. This will return a list of valid indices. If the array is empty, no indices exist for the pattern. For example:
```typescript
  // Given
  findExistingIndices(['auditbeat-*', 'fakebeat-*', 'packetbeat-*'])
  // Returns
  [true, false, true]
```