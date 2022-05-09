# Sourcerer Redux

Sourcerer model for redux
```typescript
interface SourcererModel {
  /** default security-solution data view */
  defaultDataView: SourcererDataView & { id: string; error?: unknown };
  /** all Kibana data views, including security-solution */
  kibanaDataViews: SourcererDataView[];
  /** security solution signals index name */
  signalIndexName: string | null;
  /** sourcerer scope data by id */
  sourcererScopes: SourcererScopeById;
}
```

The SourcererScopeName uniquely identifies a Sourcerer Scope. There are 3 in our app:
```typescript
enum SourcererScopeName {
  default = 'default',
  detections = 'detections',
  timeline = 'timeline',
}
```

Data related to each sourcerer scope
```typescript
interface SourcererScope {
  /** Uniquely identifies a Sourcerer Scope */
  id: SourcererScopeName;
  /** is an update being made to the sourcerer data view */
  loading: boolean;
  /** selected data view id, null if it is legacy index patterns*/
  selectedDataViewId: string | null;
  /** selected patterns within the data view */
  selectedPatterns: string[];
  /** if has length,
   * id === SourcererScopeName.timeline
   * selectedDataViewId === null OR defaultDataView.id
   * saved timeline has pattern that is not in the default */
  missingPatterns: string[];
}

type SourcererScopeById = Record<SourcererScopeName, SourcererScope>;
```

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

KibanaDataView + timelines/index_fields enhanced field data
```typescript
interface SourcererDataView extends KibanaDataView {
  id: string;
  /** determines how we can use the field in the app
   * aggregatable, searchable, type, example
   * category, description, format
   * indices the field is included in etc*/
  browserFields: BrowserFields;
  /** query DSL field and format */
  docValueFields: DocValueFields[];
  /** comes from dataView.fields.toSpec() */
  indexFields: SecuritySolutionDataViewBase['fields'];
  /** set when data view fields are fetched */
  loading: boolean;
  /**
   * Needed to pass to search strategy
   * Remove once issue resolved: https://github.com/elastic/kibana/issues/111762
   */
  runtimeMappings: MappingRuntimeFields;
}
```