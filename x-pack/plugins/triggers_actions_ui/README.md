# Kibana Alerts and Actions UI

The Kibana alerts and actions UI plugin provides a user interface for managing alerts and actions. 
As a developer you can reuse and extend built-in alerts and actions UI functionality:

- Create and register a new Alert Type.
- Create and register a new Action Type.
- Embed the Create Alert flyout within any Kibana plugin.

-----


Table of Contents

- [Kibana Alerts and Actions UI](#kibana-alerts-and-actions-ui)
  - [Build and register Alert Types](#build-and-register-alert-types)
    - [Built-in Alert Types](#built-in-alert-types)
      - [Index Threshold Alert](#index-threshold-alert)
    - [Alert type model definition](#alert-type-model-definition)
    - [Register alert type model](#register-alert-type-model)
    - [Create and register new alert type UI example](#create-and-register-new-alert-type-ui-example)
    - [Common expression components](#common-expression-components)
      - [WHEN expression component](#when-expression-component)
      - [OF expression component](#of-expression-component)
      - [GROUPED BY expression component](#grouped-by-expression-component)
      - [FOR THE LAST expression component](#for-the-last-expression-component)
      - [THRESHOLD expression component](#threshold-expression-component)
    - [Embed the Create Alert flyout within any Kibana plugin](#embed-the-create-alert-flyout-within-any-kibana-plugin)
  - [Build and register Action Types](#build-and-register-action-types)
    - [Built-in Action Types](#built-in-action-types)
      - [Server log](#server-log)
      - [Email](#email)
      - [Slack](#slack)
      - [Index](#index)
      - [Webhook](#webhook)
      - [PagerDuty](#pagerduty)
    - [Action type model definition](#action-type-model-definition)
    - [Register action type model](#register-action-type-model)
    - [Create and register new action type UI example](#reate-and-register-new-action-type-ui-example)
    - [Embed the Alert Actions form within any Kibana plugin](#embed-the-alert-actions-form-within-any-kibana-plugin)
    - [Embed the Create Connector flyout within any Kibana plugin](#embed-the-create-connector-flyout-within-any-kibana-plugin)
    - [Embed the Edit Connector flyout within any Kibana plugin](#embed-the-edit-connector-flyout-within-any-kibana-plugin)

## Built-in Alert Types

Kibana ships with several built-in alert types:

|Type|Id|Description|
|---|---|---|
|[Index Threshold](#index-threshold-alert)|`threshold`|Index Threshold Alert|

Every alert type must be registered server side, and can optionally be registered client side.
Only alert types registered on both client and server will be displayed in the Create Alert flyout, as a part of the UI.
Built-in alert types UI are located under the folder `x-pack/plugins/triggers_actions_ui/public/application/components/builtin_alert_types`
and this is a file `x-pack/plugins/triggers_actions_ui/public/application/components/builtin_alert_types/index.ts` for client side registration.

### Index Threshold Alert

ID: `threshold`

In the Kibana UI, this alert type is available as a select card on the Create Alert flyout:
![Index Threshold select card](https://i.imgur.com/a0bqLwC.png)

AlertTypeModel:

```
export function getAlertType(): AlertTypeModel {
  return {
    id: '.index-threshold',
    name: 'Index threshold',
    iconClass: 'alert',
    alertParamsExpression: lazy(() => import('./index_threshold_expression')),
    validate: validateAlertType,
    requiresAppContext: false,
  };
}
```

alertParamsExpression should be a lazy loaded React component extending an expression using `EuiExpression` components:
![Index Threshold Alert expression form](https://i.imgur.com/Ysk1ljY.png)

```
interface IndexThresholdProps {
  alertParams: IndexThresholdAlertParams;
  setAlertParams: (property: string, value: any) => void;
  setAlertProperty: (key: string, value: any) => void;
  errors: { [key: string]: string[] };
  alertsContext: AlertsContextValue;
}
```

|Property|Description|
|---|---|
|alertParams|Set of Alert params relevant for the index threshold alert type.|
|setAlertParams|Alert reducer method, which is used to create a new copy of alert object with the changed params property any subproperty value.|
|setAlertProperty|Alert reducer method, which is used to create a new copy of alert object with the changed any direct alert property value.|
|errors|Alert level errors tracking object.|
|alertsContext|Alert context, which is used to pass down common objects like http client.|


Alert reducer is defined on the AlertAdd functional component level and passed down to the subcomponents to provide a new state of Alert object:

```
const [{ alert }, dispatch] = useReducer(alertReducer, { alert: initialAlert });

...

const setAlertProperty = (key: string, value: any) => {
    dispatch({ command: { type: 'setProperty' }, payload: { key, value } });
  };

  const setAlertParams = (key: string, value: any) => {
    dispatch({ command: { type: 'setAlertParams' }, payload: { key, value } });
  };

  const setScheduleProperty = (key: string, value: any) => {
    dispatch({ command: { type: 'setScheduleProperty' }, payload: { key, value } });
  };

  const setActionParamsProperty = (key: string, value: any, index: number) => {
    dispatch({ command: { type: 'setAlertActionParams' }, payload: { key, value, index } });
  };

  const setActionProperty = (key: string, value: any, index: number) => {
    dispatch({ command: { type: 'setAlertActionProperty' }, payload: { key, value, index } });
  };

```

'x-pack/plugins/triggers_actions_ui/public/application/sections/alert_add/alert_reducer.ts' define the methods for changing different type of alert properties:
```
export const alertReducer = (state: any, action: AlertReducerAction) => {
  const { command, payload } = action;
  const { alert } = state;

  switch (command.type) {
    // create a new alert state with a new alert value
    case 'setAlert': {
    ....
    //  create a new alert state with set new value to one alert property by key
    case 'setProperty': {
    ....
    // create a new alert state with set new value to any subproperty for a 'schedule' alert property
    case 'setScheduleProperty': {
    ....
    // create a new alert state with set new value to action subproperty by index from the array of alert actions
    case 'setAlertActionParams': {   //
    ....
    // create a new alert state with set new value to any subproperty for a 'params' alert property
    case 'setAlertParams': {
      const { key, value } = payload;
      if (isEqual(alert.params[key], value)) {
        return state;
      } else {
        return {
          ...state,
          alert: {
            ...alert,
            params: {
              ...alert.params,
              [key]: value,
            },
          },
        };
      }
    }
    // create a new alert state with add or remove action from alert actions array
    case 'setAlertActionProperty': {
    ....
    }
  }

```

The Expression component should be lazy loaded which means it'll have to be the default export in `index_threshold_expression.ts`:

```
export const IndexThresholdAlertTypeExpression: React.FunctionComponent<IndexThresholdProps> = ({
  alertParams,
  setAlertParams,
  setAlertProperty,
  errors,
  alertsContext,
}) => {

  ....

  // expression validation
  const hasExpressionErrors = !!Object.keys(errors).find(
    errorKey =>
      expressionFieldsWithValidation.includes(errorKey) &&
      errors[errorKey].length >= 1 &&
      (alertParams as { [key: string]: any })[errorKey] !== undefined
  );

  ....

  // loading indeces and set default expression values
  useEffect(() => {
    getIndexPatterns();
  }, []);

  useEffect(() => {
    setDefaultExpressionValues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  ....

  return (
    <Fragment>
      {hasExpressionErrors ? (
        <Fragment>
          <EuiSpacer />
          <EuiCallOut color="danger" size="s" title={expressionErrorMessage} />
          <EuiSpacer />
        </Fragment>
      ) : null}
      <EuiSpacer size="l" />
      <EuiFormLabel>
        <FormattedMessage
          defaultMessage="Select Index to query:"
          id="xpack.triggersActionsUI.sections.alertAdd.selectIndex"
        />
  ....
      </Fragment>
  );
};

// Export as default in order to support lazy loading
export {IndexThresholdAlertTypeExpression as default};
```

Index Threshold Alert form with validation:
![Index Threshold Alert validation](https://i.imgur.com/TV8c7hL.png)

## Alert type model definition

Each alert type should be defined as `AlertTypeModel` object with the these properties:
```
  id: string;
  name: string;
  iconClass: string;
  validate: (alertParams: any) => ValidationResult;
  alertParamsExpression: React.LazyExoticComponent<
        ComponentType<AlertTypeParamsExpressionProps<AlertParamsType, AlertsContextValue>>
      >;
  defaultActionMessage?: string;
```
|Property|Description|
|---|---|
|id|Alert type id. Should be the same as on the server side.|
|name|Name of the alert type that will be displayed on the select card in the UI.|
|iconClass|Icon of the alert type that will be displayed on the select card in the UI.|
|validate|Validation function for the alert params.|
|alertParamsExpression| A lazy loaded React component for building UI of the current alert type params.|
|defaultActionMessage|Optional property for providing default message for all added actions with `message` property.|
|requiresAppContext|Define if alert type is enabled for create and edit in the alerting management UI.|

IMPORTANT: The current UI supports a single action group only. 
Action groups are mapped from the server API result for [GET /api/alerts/list_alert_types: List alert types](https://github.com/elastic/kibana/tree/master/x-pack/plugins/alerts#get-apialerttypes-list-alert-types).
Server side alert type model:
```
export interface AlertType {
  id: string;
  name: string;
  validate?: {
    params?: { validate: (object: any) => any };
  };
  actionGroups: string[];
  executor: ({ services, params, state }: AlertExecutorOptions) => Promise<State | void>;
  requiresAppContext: boolean;
}
```
Only the default (which means first item of the array) action group is displayed in the current UI.
Design of user interface and server API for multiple action groups is under discussion and development.

## Register alert type model

There are two ways of registering a new alert type:

1. Directly in the `triggers_actions_ui` plugin. In this case, the alert type will be available in the Create Alert flyout of the Alerts and Actions management section.
Registration code for a new alert type model should be added to the file `x-pack/plugins/triggers_actions_ui/public/application/components/builtin_alert_types/index.ts`
Only registered alert types are available in UI.

2. Register the alert type in another plugin. In this case, the alert type will be available only in the current plugin UI. 
It should be done by importing dependency `TriggersAndActionsUIPublicPluginSetup` and adding the next code on plugin setup:

```
function getSomeNewAlertType() {
  return { ... } as AlertTypeModel;
}

triggers_actions_ui.alertTypeRegistry.register(getSomeNewAlertType());
```

## Create and register new alert type UI example

Before registering a UI for a new Alert Type, you should first register the type on the server-side by following the Alerting guide: https://github.com/elastic/kibana/tree/master/x-pack/plugins/alerts#example 

Alert type UI is expected to be defined as `AlertTypeModel` object.

Below is a list of steps that should be done to build and register a new alert type with the name `Example Alert Type`:

1. At any suitable place in Kibana, create a file, which will expose an object implementing interface [AlertTypeModel](https://github.com/elastic/kibana/blob/55b7905fb5265b73806006e7265739545d7521d0/x-pack/legacy/plugins/triggers_actions_ui/np_ready/public/types.ts#L83). Example:
```
import { lazy } from 'react';
import { AlertTypeModel } from '../../../../types';
import { validateExampleAlertType } from './validation';

export function getAlertType(): AlertTypeModel {
  return {
    id: 'example',
    name: 'Example Alert Type',
    iconClass: 'bell',
    alertParamsExpression: lazy(() => import('./expression')),
    validate: validateExampleAlertType,
    defaultActionMessage: 'Alert [{{ctx.metadata.name}}] has exceeded the threshold',
    requiresAppContext: false,
  };
}
```
Fields of this object `AlertTypeModel` will be mapped properly in the UI below.

2. Define `alertParamsExpression` as `React.FunctionComponent` - this is the form for filling Alert params based on the current Alert type.
```
import React, { Fragment, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { WhenExpression, OfExpression } from '../../../../common/expression_items';
import { builtInAggregationTypes } from '../../../../common/constants';

interface ExampleProps {
  testAggType?: string;
  testAggField?: string;
  errors: { [key: string]: string[] };
}

export const ExampleExpression: React.FunctionComponent<ExampleProps> = ({
  testAggType,
  testAggField,
  errors,
}) => {
  const [aggType, setAggType] = useState<string>('count');
  return (
    <Fragment>
      <EuiFlexGroup gutterSize="s" wrap>
        <EuiFlexItem grow={false}>
          <WhenExpression
            aggType={testAggType ?? 'count'} // defult is 'count'
            onChangeSelectedAggType={(selectedAggType: string) => {
              console.log(`Set alert type params field "aggType" value as ${selectedAggType}`);
              setAggType(selectedAggType);
            }}
          />
        </EuiFlexItem>
        {aggType && builtInAggregationTypes[aggType].fieldRequired ? (
          <EuiFlexItem grow={false}>
            <OfExpression
              aggField={testAggField}
              fields={[{ normalizedType: 'number', name: 'test' }]} // can be some data from server API
              aggType={aggType}
              errors={errors}
              onChangeSelectedAggField={(selectedAggField?: string) =>
                console.log(`Set alert type params field "aggField" value as ${selectedAggField}`)
              }
            />
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </Fragment>
  );
};

// Export as default in order to support lazy loading
export {ExampleExpression as default};

```
This alert type form becomes available, when the card of `Example Alert Type` is selected.
Each expression word here is `EuiExpression` component and implements the basic aggregation, grouping and comparison methods.
Expression components, which can be embedded to different alert types, are described here [Common expression components](#common-expression-components).

3. Define alert type params validation using the property of `AlertTypeModel` `validate`: 
```
import { i18n } from '@kbn/i18n';
import { ValidationResult } from '../../../../types';

export function validateExampleAlertType({
  testAggField,
}: {
  testAggField: string;
}): ValidationResult {
  const validationResult = { errors: {} };
  const errors = {
    aggField: new Array<string>(),
  };
  validationResult.errors = errors;
  if (!testAggField) {
    errors.aggField.push(
      i18n.translate('xpack.triggersActionsUI.components.example.error.requiredTestAggFieldText', {
        defaultMessage: 'Test aggregation field is required.',
      })
    );
  }
  return validationResult;
}
```

4. Extend registration code with the new alert type register in the file `x-pack/plugins/triggers_actions_ui/public/application/components/builtin_alert_types/index.ts`
```
import { getAlertType as getExampledAlertType } from './example';
...

...
alertTypeRegistry.register(getExampledAlertType());
```

After these four steps, the new `Example Alert Type` is available in UI of Create flyout:
![Example Alert Type is in the select cards list](https://i.imgur.com/j71AEQV.png)

Click on the select card for `Example Alert Type` to open the expression form that was created in step 2:
![Example Alert Type expression with validation](https://i.imgur.com/Z0jIwCS.png)

## Common expression components

### WHEN expression component

![WHEN](https://i.imgur.com/7bYlxXK.png)

```
<WhenExpression
  aggType={aggType ?? DEFAULT_VALUES.AGGREGATION_TYPE}
  onChangeSelectedAggType={(selectedAggType: string) =>
    setAlertParams('aggType', selectedAggType)
  }
/>
```

Props definition:
```
interface WhenExpressionProps {
  aggType: string;
  customAggTypesOptions?: { [key: string]: AggregationType };
  onChangeSelectedAggType: (selectedAggType: string) => void;
  popupPosition?: 'upCenter' | 'upLeft' | 'upRight' | 'downCenter' | 'downLeft'
    | 'downRight' | 'leftCenter' | 'leftUp' | 'leftDown' | 'rightCenter' | 'rightUp' | 'rightDown';
}
```

|Property|Description|
|---|---|
|aggType|Selected aggregation type that will be set as the alert type property.|
|customAggTypesOptions|(Optional) List of aggregation types that replaces the default options defined in constants `x-pack/plugins/triggers_actions_ui/public/common/constants/aggregation_types.ts`.|
|onChangeSelectedAggType|event handler that will be executed when selected aggregation type is changed.|
|popupPosition|(Optional) expression popup position. Default is `downLeft`.  Recommend changing it for a small parent window space.|

### OF expression component

![OF](https://i.imgur.com/4MC8Kbb.png)

OF expression is available, if aggregation type requires selecting data fields for aggregating.

```
<OfExpression
  aggField={aggField}
  fields={esFields}
  aggType={aggType}
  errors={errors}
  onChangeSelectedAggField={(selectedAggField?: string) =>
    setAlertParams('aggField', selectedAggField)
  }
/>
```

Props definition:
```
interface OfExpressionProps {
  aggType: string;
  aggField?: string;
  errors: { [key: string]: string[] };
  onChangeSelectedAggField: (selectedAggType?: string) => void;
  fields: Record<string, any>;
  customAggTypesOptions?: {
    [key: string]: AggregationType;
  };
  popupPosition?: 'upCenter' | 'upLeft' | 'upRight' | 'downCenter' | 'downLeft'
    | 'downRight' | 'leftCenter' | 'leftUp' | 'leftDown' | 'rightCenter' | 'rightUp' | 'rightDown';
}
```

|Property|Description|
|---|---|
|aggType|Selected aggregation type that will be set as the alert type property.|
|aggField|Selected aggregation field that will be set as the alert type property.|
|errors|List of errors with proper messages for the alert params that should be validated. In current component is validated `aggField`.|
|onChangeSelectedAggField|Event handler that will be excuted if selected aggregation field is changed.|
|fields|Fields list that will be available in the OF `Select a field` dropdown.|
|customAggTypesOptions|(Optional) List of aggregation types that replaces the default options defined in constants `x-pack/plugins/triggers_actions_ui/public/common/constants/aggregation_types.ts`.|
|popupPosition|(Optional) expression popup position. Default is `downRight`. Recommend changing it for a small parent window space.|

### GROUPED BY expression component

![GROUPED BY](https://i.imgur.com/eej7WIw.png)

```
<GroupByExpression
  groupBy={groupBy || DEFAULT_VALUES.GROUP_BY}
  termField={termField}
  termSize={termSize}
  errors={errors}
  fields={esFields}
  onChangeSelectedGroupBy={selectedGroupBy => setAlertParams('groupBy', selectedGroupBy)}
  onChangeSelectedTermField={selectedTermField =>
    setAlertParams('termField', selectedTermField)
  }
  onChangeSelectedTermSize={selectedTermSize =>
    setAlertParams('termSize', selectedTermSize)
  }
/>
```

Props definition:
```
interface GroupByExpressionProps {
  groupBy: string;
  termSize?: number;
  termField?: string;
  errors: { [key: string]: string[] };
  onChangeSelectedTermSize: (selectedTermSize?: number) => void;
  onChangeSelectedTermField: (selectedTermField?: string) => void;
  onChangeSelectedGroupBy: (selectedGroupBy?: string) => void;
  fields: Record<string, any>;
  customGroupByTypes?: {
    [key: string]: GroupByType;
  };
  popupPosition?: 'upCenter' | 'upLeft' | 'upRight' | 'downCenter' | 'downLeft'
    | 'downRight' | 'leftCenter' | 'leftUp' | 'leftDown' | 'rightCenter' | 'rightUp' | 'rightDown';
}
```

|Property|Description|
|---|---|
|groupBy|Selected group by type that will be set as the alert type property.|
|termSize|Selected term size that will be set as the alert type property.|
|termField|Selected term field that will be set as the alert type property.|
|errors|List of errors with proper messages for the alert params that should be validated. In current component is validated `termSize` and `termField`.|
|onChangeSelectedTermSize|Event handler that will be excuted if selected term size is changed.|
|onChangeSelectedTermField|Event handler that will be excuted if selected term field is changed.|
|onChangeSelectedGroupBy|Event handler that will be excuted if selected group by is changed.|
|fields|Fields list with options for the `termField` dropdown.|
|customGroupByTypes|(Optional) List of group by types that replaces the default options defined in constants `x-pack/plugins/triggers_actions_ui/public/common/constants/group_by_types.ts`.|
|popupPosition|(Optional) expression popup position. Default is `downLeft`. Recommend changing it for a small parent window space.|

### FOR THE LAST expression component

![FOR THE LAST](https://i.imgur.com/vYJTo8F.png)

```
<ForLastExpression
  timeWindowSize={timeWindowSize || 1}
  timeWindowUnit={timeWindowUnit || ''}
  errors={errors}
  onChangeWindowSize={(selectedWindowSize: any) =>
    setAlertParams('timeWindowSize', selectedWindowSize)
  }
  onChangeWindowUnit={(selectedWindowUnit: any) =>
    setAlertParams('timeWindowUnit', selectedWindowUnit)
  }
/>
```

Props definition:
```
interface ForLastExpressionProps {
  timeWindowSize?: number;
  timeWindowUnit?: string;
  errors: { [key: string]: string[] };
  onChangeWindowSize: (selectedWindowSize: number | '') => void;
  onChangeWindowUnit: (selectedWindowUnit: string) => void;
  popupPosition?: 'upCenter' | 'upLeft' | 'upRight' | 'downCenter' | 'downLeft'
    | 'downRight' | 'leftCenter' | 'leftUp' | 'leftDown' | 'rightCenter' | 'rightUp' | 'rightDown';
}
```

|Property|Description|
|---|---|
|timeWindowSize|Selected time window size that will be set as the alert type property.|
|timeWindowUnit|Selected time window unit that will be set as the alert type property.|
|errors|List of errors with proper messages for the alert params that should be validated. In current component is validated `termWindowSize`.|
|onChangeWindowSize|Event handler that will be excuted if selected window size is changed.|
|onChangeWindowUnit|Event handler that will be excuted if selected window unit is changed.|
|popupPosition|(Optional) expression popup position. Default is `downLeft`. Recommend changing it for a small parent window space.|

### THRESHOLD expression component

![THRESHOLD](https://i.imgur.com/B92ZcT8.png)

```
<ThresholdExpression
  thresholdComparator={thresholdComparator ?? DEFAULT_VALUES.THRESHOLD_COMPARATOR}
  threshold={threshold}
  errors={errors}
  onChangeSelectedThreshold={selectedThresholds =>
    setAlertParams('threshold', selectedThresholds)
  }
  onChangeSelectedThresholdComparator={selectedThresholdComparator =>
    setAlertParams('thresholdComparator', selectedThresholdComparator)
  }
/>
```

Props definition:
```
interface ThresholdExpressionProps {
  thresholdComparator: string;
  errors: { [key: string]: string[] };
  onChangeSelectedThresholdComparator: (selectedThresholdComparator?: string) => void;
  onChangeSelectedThreshold: (selectedThreshold?: number[]) => void;
  customComparators?: {
    [key: string]: Comparator;
  };
  threshold?: number[];
  popupPosition?: 'upCenter' | 'upLeft' | 'upRight' | 'downCenter' | 'downLeft'
    | 'downRight' | 'leftCenter' | 'leftUp' | 'leftDown' | 'rightCenter' | 'rightUp' | 'rightDown';
}
```

|Property|Description|
|---|---|
|thresholdComparator|Selected time window size that will be set as the alert type property.|
|threshold|Selected time window size that will be set as the alert type property.|
|errors|List of errors with proper messages for the alert params that should be validated. In current component is validated `threshold0` and `threshold1`.|
|onChangeSelectedThresholdComparator|Event handler that will be excuted if selected threshold comparator is changed.|
|onChangeSelectedThreshold|Event handler that will be excuted if selected threshold is changed.|
|customComparators|(Optional) List of comparators that replaces the default options defined in constants `x-pack/plugins/triggers_actions_ui/public/common/constants/comparators.ts`.|
|popupPosition|(Optional) expression popup position. Default is `downLeft`. Recommend changing it for a small parent window space.|

## Embed the Create Alert flyout within any Kibana plugin

Follow the instructions bellow to embed the Create Alert flyout within any Kibana plugin:
1. Add TriggersAndActionsUIPublicPluginSetup to Kibana plugin setup dependencies:

```
triggers_actions_ui: TriggersAndActionsUIPublicPluginSetup;
```
Then this dependency will be used to embed Create Alert flyout or register new alert/action type.

2. Add Create Alert flyout to React component:
```
// import section
import { AlertsContextProvider, AlertAdd } from '../../../../../../../triggers_actions_ui/public';

// in the component state definition section
const [alertFlyoutVisible, setAlertFlyoutVisibility] = useState<boolean>(false);

// UI control item for open flyout
<EuiButton
  fill
  iconType="plusInCircle"
  iconSide="left"
  onClick={() => setAlertFlyoutVisibility(true)}
>
  <FormattedMessage
    id="emptyButton"
    defaultMessage="Create alert"
  />
</EuiButton>

// in render section of component
<AlertsContextProvider
  value={{
    http,
    actionTypeRegistry: triggers_actions_ui.actionTypeRegistry,
    alertTypeRegistry: triggers_actions_ui.alertTypeRegistry,
    toastNotifications: toasts,
    uiSettings,
    docLinks,
    charts,
    dataFieldsFormats,
    metadata: { test: 'some value', fields: ['test'] },
  }}
>
  <AlertAdd consumer={'watcher'} addFlyoutVisible={alertFlyoutVisible}
    setAddFlyoutVisibility={setAlertFlyoutVisibility} />
</AlertsContextProvider>
```

AlertAdd Props definition:
```
interface AlertAddProps {
  consumer: string;
  addFlyoutVisible: boolean;
  setAddFlyoutVisibility: React.Dispatch<React.SetStateAction<boolean>>;
  alertTypeId?: string;
  canChangeTrigger?: boolean;
}
```

|Property|Description|
|---|---|
|consumer|Name of the plugin that creates an alert.|
|addFlyoutVisible|Visibility state of the Create Alert flyout.|
|setAddFlyoutVisibility|Function for changing visibility state of the Create Alert flyout.|
|alertTypeId|Optional property to preselect alert type.|
|canChangeTrigger|Optional property, that hides change alert type possibility.|

AlertsContextProvider value options:
```
export interface AlertsContextValue<MetaData = Record<string, any>> {
  reloadAlerts?: () => Promise<void>;
  http: HttpSetup;
  alertTypeRegistry: TypeRegistry<AlertTypeModel>;
  actionTypeRegistry: TypeRegistry<ActionTypeModel>;
  uiSettings?: IUiSettingsClient;
  docLinks: DocLinksStart;
  toastNotifications: Pick<
    ToastsApi,
    'get$' | 'add' | 'remove' | 'addSuccess' | 'addWarning' | 'addDanger' | 'addError'
  >;
  charts?: ChartsPluginSetup;
  dataFieldsFormats?: Pick<FieldFormatsRegistry, 'register'>;
  metadata?: MetaData;
}
```

|Property|Description|
|---|---|
|reloadAlerts|Optional function, which will be executed if alert was saved sucsessfuly.|
|http|HttpSetup needed for executing API calls.|
|alertTypeRegistry|Registry for alert types.|
|actionTypeRegistry|Registry for action types.|
|uiSettings|Optional property, which is needed to display visualization of alert type expression. Will be changed after visualization refactoring.|
|docLinks|Documentation Links, needed to link to the documentation from informational callouts.|
|toastNotifications|Toast messages.|
|charts|Optional property, which is needed to display visualization of alert type expression. Will be changed after visualization refactoring.|
|dataFieldsFormats|Optional property, which is needed to display visualization of alert type expression. Will be changed after visualization refactoring.|
|metadata|Optional generic property, which allows to define component specific metadata. This metadata can be used for passing down preloaded data for Alert type expression component.|

## Build and register Action Types

Kibana ships with a set of built-in action types UI:

|Type|Id|Description|
|---|---|---|
|[Server log](#server-log)|`.log`|Logs messages to the Kibana log using `server.log()`|
|[Email](#email)|`.email`|Sends an email using SMTP|
|[Slack](#slack)|`.slack`|Posts a message to a Slack channel|
|[Index](#index)|`.index`|Indexes document(s) into Elasticsearch|
|[Webhook](#webhook)|`.webhook`|Sends a payload to a web service using HTTP POST or PUT|
|[PagerDuty](#pagerduty)|`.pagerduty`|Triggers, resolves, or acknowledges an incident to a PagerDuty service|

Every action type should be registered server side, and can be optionally registered client side. 
Only action types registered on both client and server will be displayed in the Alerts and Actions UI.
Built-in action types UI is located under the folder `x-pack/plugins/triggers_actions_ui/public/application/components/builtin_action_types`
and this is a file `x-pack/plugins/triggers_actions_ui/public/application/components/builtin_action_types/index.ts` for client side registration.


### Server log

Action type model definition:
```
export function getActionType(): ActionTypeModel {
  return {
    id: '.server-log',
    iconClass: 'logsApp',
    selectMessage: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.serverLogAction.selectMessageText',
      {
        defaultMessage: 'Add a message to a Kibana log.',
      }
    ),
    actionTypeTitle: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.serverLogAction.actionTypeTitle',
      {
        defaultMessage: 'Send to Server log',
      }
    ),
    validateConnector: (): ValidationResult => {
      return { errors: {} };
    },
    validateParams: (actionParams: ServerLogActionParams): ValidationResult => {
      // validation of action params implementation
    },
    actionConnectorFields: null,
    actionParamsFields: ServerLogParamsFields,
  };
}
```
Server log has a connector UI:

![Server log connector card](https://i.imgur.com/ZIWhV89.png)

![Server log connector form](https://i.imgur.com/rkc3U59.png)

and action params form available in Create Alert form:
![Server log action form](https://i.imgur.com/c0ds76T.png)

### Email

Action type model definition:
```
export function getActionType(): ActionTypeModel {
  const mailformat = /^[^@\s]+@[^@\s]+$/;
  return {
    id: '.email',
    iconClass: 'email',
    selectMessage: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.emailAction.selectMessageText',
      {
        defaultMessage: 'Send email from your server.',
      }
    ),
    actionTypeTitle: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.emailAction.actionTypeTitle',
      {
        defaultMessage: 'Send to email',
      }
    ),
    validateConnector: (action: EmailActionConnector): ValidationResult => {
      // validation of connector properties implementation
    },
    validateParams: (actionParams: EmailActionParams): ValidationResult => {
      // validation of action params implementation
    },
    actionConnectorFields: EmailActionConnectorFields,
    actionParamsFields: EmailParamsFields,
  };
}
```
![Email connector card](https://i.imgur.com/d8kCbjQ.png)

![Email connector form](https://i.imgur.com/Uf6HU7X.png)

and action params form available in Create Alert form:
![Email action form](https://i.imgur.com/lhkUEHf.png)

### Slack

Action type model definition:
```
export function getActionType(): ActionTypeModel {
  return {
    id: '.slack',
    iconClass: 'logoSlack',
    selectMessage: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.slackAction.selectMessageText',
      {
        defaultMessage: 'Send a message to a Slack channel or user.',
      }
    ),
    actionTypeTitle: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.slackAction.actionTypeTitle',
      {
        defaultMessage: 'Send to Slack',
      }
    ),
    validateConnector: (action: SlackActionConnector): ValidationResult => {
      // validation of connector properties implementation
    },
    validateParams: (actionParams: SlackActionParams): ValidationResult => {
      // validation of action params implementation 
    },
    actionConnectorFields: SlackActionFields,
    actionParamsFields: SlackParamsFields,
  };
}
```

![Slack connector card](https://i.imgur.com/JbvmNOy.png)

![Slack connector form](https://i.imgur.com/IqdnmF9.png)

and action params form available in Create Alert form:
![Slack action form](https://i.imgur.com/GUEVZWK.png)

### Index

Action type model definition:
```
export function getActionType(): ActionTypeModel {
  return {
    id: '.index',
    iconClass: 'indexOpen',
    selectMessage: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.indexAction.selectMessageText',
      {
        defaultMessage: 'Index data into Elasticsearch.',
      }
    ),
    validateConnector: (): ValidationResult => {
      return { errors: {} };
    },
    actionConnectorFields: IndexActionConnectorFields,
    actionParamsFields: IndexParamsFields,
    validateParams: (): ValidationResult => {
      return { errors: {} };
    },
  };
}
```

![Index connector card](https://i.imgur.com/fflsmu5.png)

![Index connector form](https://i.imgur.com/IkixGMV.png)

and action params form available in Create Alert form:
![Index action form](https://i.imgur.com/mpxnPOF.png)

Example of the index document for Index Threshold alert:

```
{
    "alert_id": "{{alertId}}",
    "alert_name": "{{alertName}}",
    "alert_instance_id": "{{alertInstanceId}}",
    "context_title": "{{context.title}}",
    "context_value": "{{context.value}}",
    "context_message": "{{context.message}}"
} 
```

### Webhook

Action type model definition:
```
export function getActionType(): ActionTypeModel {
  return {
    id: '.webhook',
    iconClass: 'logoWebhook',
    selectMessage: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.webhookAction.selectMessageText',
      {
        defaultMessage: 'Send a request to a web service.',
      }
    ),
    validateConnector: (action: WebhookActionConnector): ValidationResult => {
      // validation of connector properties implementation
    },
    validateParams: (actionParams: WebhookActionParams): ValidationResult => {
      // validation of action params implementation
    },
    actionConnectorFields: WebhookActionConnectorFields,
    actionParamsFields: WebhookParamsFields,
  };
}
```

![Webhook connector card](https://i.imgur.com/IBgn75T.png)

![Webhook connector form](https://i.imgur.com/xqORAJ7.png)

and action params form available in Create Alert form:
![Webhook action form](https://i.imgur.com/mBGfeuC.png)


### PagerDuty

Action type model definition:
```
export function getActionType(): ActionTypeModel {
  return {
    id: '.pagerduty',
    iconClass: 'apps',
    selectMessage: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.selectMessageText',
      {
        defaultMessage: 'Send an event in PagerDuty.',
      }
    ),
    actionTypeTitle: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.actionTypeTitle',
      {
        defaultMessage: 'Send to PagerDuty',
      }
    ),
    validateConnector: (action: PagerDutyActionConnector): ValidationResult => {
      // validation of connector properties implementation
    },
    validateParams: (actionParams: PagerDutyActionParams): ValidationResult => {
      // validation of action params implementation
    },
    actionConnectorFields: PagerDutyActionConnectorFields,
    actionParamsFields: PagerDutyParamsFields,
  };
}
```

![PagerDuty connector card](https://i.imgur.com/Br8MuKG.png)

![PagerDuty connector form](https://i.imgur.com/DZpCfRv.png)

and action params form available in Create Alert form:
![PagerDuty action form](https://i.imgur.com/xxXmhMK.png)

## Action type model definition

Each action type should be defined as an `ActionTypeModel` object with the following properties:
```
  id: string;
  iconClass: string;
  selectMessage: string;
  actionTypeTitle?: string;
  validateConnector: (connector: any) => ValidationResult;
  validateParams: (actionParams: any) => ValidationResult;
  actionConnectorFields: React.FunctionComponent<any> | null;
  actionParamsFields: any;
```
|Property|Description|
|---|---|
|id|Action type id. Should be the same as on server side.|
|iconClass|Icon of action type, that will be displayed on the select card in UI.|
|selectMessage|Short description of action type responsibility, that will be displayed on the select card in UI.|
|validateConnector|Validation function for action connector.|
|validateParams|Validation function for action params.|
|actionConnectorFields|A lazy loaded React component for building UI of current action type connector.|
|actionParamsFields|A lazy loaded React component for building UI of current action type params. Displayed as a part of Create Alert flyout.|

## Register action type model

There are two ways to register a new action type UI:

1. Directly in `triggers_actions_ui` plugin. In this case, the action type will be available in the Alerts and Actions management section.
Registration code for a new action type model should be added to the file `x-pack/plugins/triggers_actions_ui/public/application/components/builtin_action_types/index.ts`
Only registered action types are available in UI.

2. Register action type in another plugin. In this case, the action type will be available only in the current plugin UI.
It should be done by importing dependency `TriggersAndActionsUIPublicPluginSetup` and adding the next code on plugin setup:

```
function getSomeNewActionType() {
  return { ... } as ActionTypeModel;
}

triggers_actions_ui.actionTypeRegistry.register(getSomeNewActionType());
```

## Create and register new action type UI

Before starting the UI implementation, the [server side registration](https://github.com/elastic/kibana/tree/master/x-pack/plugins/actions#kibana-actions-configuration) should be done first.

Action type UI is expected to be defined as `ActionTypeModel` object.

Below is a list of steps that should be done to build and register a new action type with the name `Example Action Type`:

1. At any suitable place in Kibana, create a file, which will expose an object implementing interface [ActionTypeModel]:
```
import React, { Fragment, lazy } from 'react';
import { i18n } from '@kbn/i18n';
import {
  ActionTypeModel,
  ValidationResult,
  ActionConnectorFieldsProps,
  ActionParamsProps,
} from '../../../types';

interface ExampleActionParams {
  message: string;
}

export function getActionType(): ActionTypeModel {
  return {
    id: '.example-action',
    iconClass: 'logoGmail',
    selectMessage: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.exampleAction.selectMessageText',
      {
        defaultMessage: 'Example Action is used to show how to create new action type UI.',
      }
    ),
    actionTypeTitle: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.exampleAction.actionTypeTitle',
      {
        defaultMessage: 'Example Action',
      }
    ),
    validateConnector: (action: ExampleActionConnector): ValidationResult => {
      const validationResult = { errors: {} };
      const errors = {
        someConnectorField: new Array<string>(),
      };
      validationResult.errors = errors;
      if (!action.config.someConnectorField) {
        errors.someConnectorField.push(
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredSomeConnectorFieldeText',
            {
              defaultMessage: 'SomeConnectorField is required.',
            }
          )
        );
      }
      return validationResult;
    },
    validateParams: (actionParams: ExampleActionParams): ValidationResult => {
      const validationResult = { errors: {} };
      const errors = {
        message: new Array<string>(),
      };
      validationResult.errors = errors;
      if (!actionParams.message?.length) {
        errors.message.push(
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredExampleMessageText',
            {
              defaultMessage: 'Message is required.',
            }
          )
        );
      }
      return validationResult;
    },
    actionConnectorFields: lazy(() => import('./example_connector_fields')),
    actionParamsFields: lazy(() => import('./example_params_fields')),
  };
}
```

2. Define `actionConnectorFields` as `React.FunctionComponent` - this is the form for action connector.
```
import React, { Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFieldText } from '@elastic/eui';
import { EuiTextArea } from '@elastic/eui';
import {
  ActionTypeModel,
  ValidationResult,
  ActionConnectorFieldsProps,
  ActionParamsProps,
} from '../../../types';

interface ExampleActionConnector {
  config: {
    someConnectorField: string;
  };
}

const ExampleConnectorFields: React.FunctionComponent<ActionConnectorFieldsProps<
  ExampleActionConnector
>> = ({ action, editActionConfig, errors }) => {
  const { someConnectorField } = action.config;
  return (
    <Fragment>
      <EuiFieldText
        fullWidth
        isInvalid={errors.someConnectorField.length > 0 && someConnectorField !== undefined}
        name="someConnectorField"
        value={someConnectorField || ''}
        onChange={e => {
          editActionConfig('someConnectorField', e.target.value);
        }}
        onBlur={() => {
          if (!someConnectorField) {
            editActionConfig('someConnectorField', '');
          }
        }}
      />
    </Fragment>
  );
};

// Export as default in order to support lazy loading
export {ExampleConnectorFields as default};
```

3. Define action type params fields using the property of `ActionTypeModel` `actionParamsFields`: 
```
import React, { Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFieldText } from '@elastic/eui';
import { EuiTextArea } from '@elastic/eui';
import {
  ActionTypeModel,
  ValidationResult,
  ActionConnectorFieldsProps,
  ActionParamsProps,
} from '../../../types';

interface ExampleActionParams {
  message: string;
}

const ExampleParamsFields: React.FunctionComponent<ActionParamsProps<ExampleActionParams>> = ({
  actionParams,
  editAction,
  index,
  errors,
}) => {
  const { message } = actionParams;
  return (
    <Fragment>
      <EuiTextArea
        fullWidth
        isInvalid={errors.message.length > 0 && message !== undefined}
        name="message"
        value={message || ''}
        onChange={e => {
          editAction('message', e.target.value, index);
        }}
        onBlur={() => {
          if (!message) {
            editAction('message', '', index);
          }
        }}
      />
    </Fragment>
  );
};

// Export as default in order to support lazy loading
export {ExampleParamsFields as default};
```

4. Extend registration code with the new action type register in the file `x-pack/plugins/triggers_actions_ui/public/application/components/builtin_action_types/index.ts`
```
import { getActionType as getExampledActionType } from './example';
...

...
actionTypeRegistry.register(getExampledActionType());
```

After these four steps, the new `Example Action Type` is available in UI of Create connector:
![Example Action Type is in the select cards list](https://i.imgur.com/PTYdBos.png)

Clicking on the select card for `Example Action Type` will open the connector form that was created in step 2:
![Example Action Type connector](https://i.imgur.com/KdxAXAs.png)

Example Action Type is in the select cards list of Create Alert flyout:
![Example Action Type is in the select cards list of Create Alert flyout](https://i.imgur.com/CSRBkFe.png)

Clicking on the select card for `Example Action Type` will open the action type Add Action form:
![Example Action Type with existing connectors list](https://i.imgur.com/8FA3NAW.png)

or create a new connector:
![Example Action Type with empty connectors list](https://i.imgur.com/EamA9Xv.png)

## Embed the Alert Actions form within any Kibana plugin

Follow the instructions bellow to embed the Alert Actions form within any Kibana plugin:
1. Add TriggersAndActionsUIPublicPluginSetup and TriggersAndActionsUIPublicPluginStart to Kibana plugin setup dependencies:

```
import {
   TriggersAndActionsUIPublicPluginSetup,
   TriggersAndActionsUIPublicPluginStart,
 } from '../../../../../x-pack/plugins/triggers_actions_ui/public';

triggers_actions_ui: TriggersAndActionsUIPublicPluginSetup;
...

triggers_actions_ui: TriggersAndActionsUIPublicPluginStart;
```
Then this dependencies will be used to embed Actions form or register your own action type.

2. Add Actions form to React component:

```
 import React, { useCallback } from 'react';
 import { ActionForm } from '../../../../../../../../../plugins/triggers_actions_ui/public';
 import { AlertAction } from '../../../../../../../../../plugins/triggers_actions_ui/public/types';

 const ALOWED_BY_PLUGIN_ACTION_TYPES = [
   { id: '.email', name: 'Email', enabled: true },
   { id: '.index', name: 'Index', enabled: false },
   { id: '.example-action', name: 'Example Action', enabled: false },
 ];

 export const ComponentWithActionsForm: () => {
   const { http, triggers_actions_ui, notifications } = useKibana().services;
   const actionTypeRegistry = triggers_actions_ui.actionTypeRegistry;
   const initialAlert = ({
        name: 'test',
        params: {},
        consumer: 'alerts',
        alertTypeId: '.index-threshold',
        schedule: {
          interval: '1m',
        },
        actions: [
          {
            group: 'default',
            id: 'test',
            actionTypeId: '.index',
            params: {
              message: '',
            },
          },
        ],
        tags: [],
        muteAll: false,
        enabled: false,
        mutedInstanceIds: [],
      } as unknown) as Alert;

   return (
     <ActionForm
          actions={initialAlert.actions}
          messageVariables={[ { name: 'testVar1', description: 'test var1' } ]}
          defaultActionGroupId={'default'}
          setActionIdByIndex={(id: string, index: number) => {
            initialAlert.actions[index].id = id;
          }}
          setAlertProperty={(_updatedActions: AlertAction[]) => {}}
          setActionParamsProperty={(key: string, value: any, index: number) =>
            (initialAlert.actions[index] = { ...initialAlert.actions[index], [key]: value })
          }
          http={http}
          actionTypeRegistry={actionTypeRegistry}
          defaultActionMessage={'Alert [{{ctx.metadata.name}}] has exceeded the threshold'}
          actionTypes={ALOWED_BY_PLUGIN_ACTION_TYPES}
          toastNotifications={notifications.toasts}
          consumer={initialAlert.consumer}
        />
   );
 };
```

ActionForm Props definition:
```
interface ActionAccordionFormProps {
  actions: AlertAction[];
  defaultActionGroupId: string;
  setActionIdByIndex: (id: string, index: number) => void;
  setAlertProperty: (actions: AlertAction[]) => void;
  setActionParamsProperty: (key: string, value: any, index: number) => void;
  http: HttpSetup;
  actionTypeRegistry: TypeRegistry<ActionTypeModel>;
  toastNotifications: Pick<
    ToastsApi,
    'get$' | 'add' | 'remove' | 'addSuccess' | 'addWarning' | 'addDanger' | 'addError'
  >;
  actionTypes?: ActionType[];
  messageVariables?: ActionVariable[];
  defaultActionMessage?: string;
  consumer: string;
}

```

|Property|Description|
|---|---|
|actions|List of actions comes from alert.actions property.|
|defaultActionGroupId|Default action group id to which each new action will belong to.|
|setActionIdByIndex|Function for changing action 'id' by the proper index in alert.actions array.|
|setAlertProperty|Function for changing alert property 'actions'. Used when deleting action from the array to reset it.|
|setActionParamsProperty|Function for changing action key/value property by index in alert.actions array.|
|http|HttpSetup needed for executing API calls.|
|actionTypeRegistry|Registry for action types.|
|toastNotifications|Toast messages.|
|actionTypes|Optional property, which allowes to define a list of available actions specific for a current plugin.|
|actionTypes|Optional property, which allowes to define a list of variables for action 'message' property.|
|defaultActionMessage|Optional property, which allowes to define a message value for action with 'message' property.|
|consumer|Name of the plugin that creates an action.|


AlertsContextProvider value options:
```
export interface AlertsContextValue {
  reloadAlerts?: () => Promise<void>;
  http: HttpSetup;
  alertTypeRegistry: TypeRegistry<AlertTypeModel>;
  actionTypeRegistry: TypeRegistry<ActionTypeModel>;
  uiSettings?: IUiSettingsClient;
  docLinks: DocLinksStart;
  toastNotifications: Pick<
    ToastsApi,
    'get$' | 'add' | 'remove' | 'addSuccess' | 'addWarning' | 'addDanger' | 'addError'
  >;
  charts?: ChartsPluginSetup;
  dataFieldsFormats?: Pick<FieldFormatsRegistry, 'register'>;
}
```

|Property|Description|
|---|---|
|reloadAlerts|Optional function, which will be executed if alert was saved sucsessfuly.|
|http|HttpSetup needed for executing API calls.|
|alertTypeRegistry|Registry for alert types.|
|actionTypeRegistry|Registry for action types.|
|uiSettings|Optional property, which is needed to display visualization of alert type expression. Will be changed after visualization refactoring.|
|docLinks|Documentation Links, needed to link to the documentation from informational callouts.|
|toastNotifications|Toast messages.|
|charts|Optional property, which is needed to display visualization of alert type expression. Will be changed after visualization refactoring.|
|dataFieldsFormats|Optional property, which is needed to display visualization of alert type expression. Will be changed after visualization refactoring.|

## Embed the Create Connector flyout within any Kibana plugin

Follow the instructions bellow to embed the Create Connector flyout within any Kibana plugin:
1. Add TriggersAndActionsUIPublicPluginSetup and TriggersAndActionsUIPublicPluginStart to Kibana plugin setup dependencies:

```
import {
   TriggersAndActionsUIPublicPluginSetup,
   TriggersAndActionsUIPublicPluginStart,
 } from '../../../../../x-pack/plugins/triggers_actions_ui/public';

triggers_actions_ui: TriggersAndActionsUIPublicPluginSetup;
...

triggers_actions_ui: TriggersAndActionsUIPublicPluginStart;
```
Then this dependency will be used to embed Create Connector flyout or register new action type.

2. Add Create Connector flyout to React component:
```
// import section
import { ActionsConnectorsContextProvider, ConnectorAddFlyout } from '../../../../../../../triggers_actions_ui/public';

// in the component state definition section
const [addFlyoutVisible, setAddFlyoutVisibility] = useState<boolean>(false);

// load required dependancied
const { http, triggers_actions_ui, notifications, application, docLinks } = useKibana().services;

const connector = {
      secrets: {},
      id: 'test',
      actionTypeId: '.index',
      actionType: 'Index',
      name: 'action-connector',
      referencedByCount: 0,
      config: {},
    };

// UI control item for open flyout
<EuiButton
  fill
  iconType="plusInCircle"
  iconSide="left"
  onClick={() => setAddFlyoutVisibility(true)}
>
  <FormattedMessage
    id="emptyButton"
    defaultMessage="Create connector"
  />
</EuiButton>

// in render section of component
<ActionsConnectorsContextProvider
        value={{
          http: http,
          toastNotifications: notifications.toasts,
          actionTypeRegistry: triggers_actions_ui.actionTypeRegistry,
          capabilities: application.capabilities,
          docLinks,
        }}
      >
        <ConnectorAddFlyout
          addFlyoutVisible={addFlyoutVisible}
          setAddFlyoutVisibility={setAddFlyoutVisibility}
          actionTypes={[
            {
              id: '.index',
              enabled: true,
              name: 'Index',
            },
          ]}
        />
</ActionsConnectorsContextProvider>
```

ConnectorAddFlyout Props definition:
```
export interface ConnectorAddFlyoutProps {
  addFlyoutVisible: boolean;
  setAddFlyoutVisibility: React.Dispatch<React.SetStateAction<boolean>>;
  actionTypes?: ActionType[];
}
```

|Property|Description|
|---|---|
|addFlyoutVisible|Visibility state of the Create Connector flyout.|
|setAddFlyoutVisibility|Function for changing visibility state of the Create Connector flyout.|
|actionTypes|Optional property, that allows to define only specific action types list which is available for a current plugin.|

ActionsConnectorsContextValue options:
```
export interface ActionsConnectorsContextValue {
  http: HttpSetup;
  actionTypeRegistry: TypeRegistry<ActionTypeModel>;
  toastNotifications: Pick<
    ToastsApi,
    'get$' | 'add' | 'remove' | 'addSuccess' | 'addWarning' | 'addDanger' | 'addError'
  >;
  capabilities: ApplicationStart['capabilities'];
  docLinks: DocLinksStart;
  reloadConnectors?: () => Promise<void>;
  consumer: string;
}
```

|Property|Description|
|---|---|
|http|HttpSetup needed for executing API calls.|
|actionTypeRegistry|Registry for action types.|
|capabilities|Property, which is defining action current user usage capabilities like canSave or canDelete.|
|toastNotifications|Toast messages.|
|reloadConnectors|Optional function, which will be executed if connector was saved sucsessfuly, like reload list of connecotrs.|
|consumer|Optional name of the plugin that creates an action.|


## Embed the Edit Connector flyout within any Kibana plugin

Follow the instructions bellow to embed the Edit Connector flyout within any Kibana plugin:
1. Add TriggersAndActionsUIPublicPluginSetup and TriggersAndActionsUIPublicPluginStart to Kibana plugin setup dependencies:

```
import {
   TriggersAndActionsUIPublicPluginSetup,
   TriggersAndActionsUIPublicPluginStart,
 } from '../../../../../x-pack/plugins/triggers_actions_ui/public';

triggers_actions_ui: TriggersAndActionsUIPublicPluginSetup;
...

triggers_actions_ui: TriggersAndActionsUIPublicPluginStart;
```
Then this dependency will be used to embed Edit Connector flyout.

2. Add Create Connector flyout to React component:
```
// import section
import { ActionsConnectorsContextProvider, ConnectorEditFlyout } from '../../../../../../../triggers_actions_ui/public';

// in the component state definition section
const [editFlyoutVisible, setEditFlyoutVisibility] = useState<boolean>(false);

// load required dependancied
const { http, triggers_actions_ui, notifications, application } = useKibana().services;

// UI control item for open flyout
<EuiButton
  fill
  iconType="plusInCircle"
  iconSide="left"
  onClick={() => setEditFlyoutVisibility(true)}
>
  <FormattedMessage
    id="emptyButton"
    defaultMessage="Edit connector"
  />
</EuiButton>

// in render section of component
<ActionsConnectorsContextProvider
        value={{
          http: http,
          toastNotifications: notifications.toasts,
          actionTypeRegistry: triggers_actions_ui.actionTypeRegistry,
          capabilities: application.capabilities,
        }}
      >
        <ConnectorEditFlyout
            initialConnector={connector}
            editFlyoutVisible={editFlyoutVisible}
            setEditFlyoutVisibility={setEditFlyoutVisibility}
          />
</ActionsConnectorsContextProvider>

```

ConnectorEditFlyout Props definition:
```
export interface ConnectorEditProps {
  initialConnector: ActionConnectorTableItem;
  editFlyoutVisible: boolean;
  setEditFlyoutVisibility: React.Dispatch<React.SetStateAction<boolean>>;
}
```

|Property|Description|
|---|---|
|initialConnector|Property, that allows to define the initial state of edited connector.|
|editFlyoutVisible|Visibility state of the Edit Connector flyout.|
|setEditFlyoutVisibility|Function for changing visibility state of the Edit Connector flyout.|

ActionsConnectorsContextValue options:
```
export interface ActionsConnectorsContextValue {
  http: HttpSetup;
  actionTypeRegistry: TypeRegistry<ActionTypeModel>;
  toastNotifications: Pick<
    ToastsApi,
    'get$' | 'add' | 'remove' | 'addSuccess' | 'addWarning' | 'addDanger' | 'addError'
  >;
  capabilities: ApplicationStart['capabilities'];
  reloadConnectors?: () => Promise<void>;
}
```

|Property|Description|
|---|---|
|http|HttpSetup needed for executing API calls.|
|actionTypeRegistry|Registry for action types.|
|capabilities|Property, which is defining action current user usage capabilities like canSave or canDelete.|
|toastNotifications|Toast messages.|
|reloadConnectors|Optional function, which will be executed if connector was saved sucsessfuly, like reload list of connecotrs.|
