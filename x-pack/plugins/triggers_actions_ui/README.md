# Kibana Alerts and Actions UI

The Kibana alerts and actions UI plugin provides a user interface for managing alerts and actions. 
As a developer you can reuse and extend buildin alerts and actions UI functionality:

- Create and register new alert type.
- Create and register new action type.
- Embed Create Alert flyout to Kibana plugins.

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
    - [Embed Create Alert flyout to Kibana plugins](#embed-create-alert-flyout-to-kibana-plugins)
  - [Build and register Action Types](#build-and-register-action-types)
    - [Built-in Action Types](#built-in-action-types)
      - [Server log](#server-log)
      - [Email](#email)
      - [Slack](#slack)
      - [Index](#index)
      - [Webhook](#webhook)
      - [PagerDuty](#pagerduty)
    - [Create and register new action type UI](#register-action-type)

## Built-in Alert Types

Kibana ships with a built-in alert types:

|Type|Id|Description|
|---|---|---|
|[Index Threshold](#index-threshold-alert)|`threshold`|Index Threshold Alert|

Every alert type should has a server side registration and can has a client side. 
Only alert types registered on both - client and server will be displayed in the Create Alert flyout, as a part of UI.
Built-in alert types UI is located under the folder `x-pack/legacy/plugins/triggers_actions_ui/np_ready/public/application/components/builtin_alert_types`
and this is a file `x-pack/legacy/plugins/triggers_actions_ui/np_ready/public/application/components/builtin_alert_types/index.ts` for client side registration.

### Index Threshold Alert

ID: `threshold`

In Kibana UI this alert type is available as a select cards on Create Alert flyout:
![Index Threshold select card](https://i.imgur.com/a0bqLwC.png)

AlertTypeModel:

```
export function getAlertType(): AlertTypeModel {
  return {
    id: 'threshold',
    name: 'Index Threshold',
    iconClass: 'alert',
    alertParamsExpression: IndexThresholdAlertTypeExpression,
    validate: validateAlertType,
  };
}
```
alertParamsExpression form represented as an expression using `EuiExpression`:
![Index Threshold Alert expression form](https://i.imgur.com/Ysk1ljY.png)

Index Threshold Alert validation:
![Index Threshold Alert validation](https://i.imgur.com/NWo78vl.png)

## Alert type model definition

Each alert type should be defined as `AlertTypeModel` object with the next properties:
```
  id: string;
  name: string;
  iconClass: string;
  validate: (alertParams: any) => ValidationResult;
  alertParamsExpression: React.FunctionComponent<any>;
  defaultActionMessage?: string;
```
|Property|Description|
|---|---|
|id|Alert type id|
|name|Name of alert type, that will be displayed on the select card in UI|
|iconClass|Icon of alert type, that will be displayed on the select card in UI|
|validate|Validation function for alert params|
|alertParamsExpression|React functional component for building UI of current alert type params|
|defaultActionMessage|Optional property for specifying default message in all actions with `message` property|

IMPORTANT! Current UI support only one default action group. 
Action groups is mapped from server API result for [GET /api/alert/types: List alert types](https://github.com/elastic/kibana/tree/master/x-pack/legacy/plugins/alerting#get-apialerttypes-list-alert-types).
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
}
```
Only one default (which means first item of the array) action group is displayed in UI.
UI design and server API for multiple action groups is on the stage of discussion and development.

## Register alert type model

There are two ways of registration new alert type:

1. Directly in `triggers_actions_ui` plugin. In this case alert type will be available in Create Alert flyout of the Alerts and Actions management section.
Registration code for a new alert type model should be added to the file `x-pack/legacy/plugins/triggers_actions_ui/np_ready/public/application/components/builtin_alert_types/index.ts`
Only registered alert types are available in UI.

2. Register alert type in other plugin. In this case alert type will be available only in current plugin UI. 
It should be done by importing dependency `TriggersAndActionsUIPublicPluginSetup` and adding the next code on plugin setup:

```
function getSomeNewAlertType() {
  return { ... } as AlertTypeModel;
}

triggers_actions_ui.alertTypeRegistry.register(getSomeNewAlertType());
```

## Create and register new alert type UI example

To be able to add UI for a new Alert type the proper server API https://github.com/elastic/kibana/tree/master/x-pack/legacy/plugins/alerting#example recommended to be done first.

Alert type UI is expected to be defined as `AlertTypeModel` object.

Below is a list of steps that should be done to build and register a new alert type with the name `Example Alert Type`:

1. At any suitable place in Kibana create a file, which will expose an object implementing interface [AlertTypeModel](https://github.com/elastic/kibana/blob/55b7905fb5265b73806006e7265739545d7521d0/x-pack/legacy/plugins/triggers_actions_ui/np_ready/public/types.ts#L83). Example:
```
import { AlertTypeModel } from '../../../../types';
import { ExampleExpression } from './expression';
import { validateExampleAlertType } from './validation';

export function getAlertType(): AlertTypeModel {
  return {
    id: 'example',
    name: 'Example Alert Type',
    iconClass: 'bell',
    alertParamsExpression: ExampleExpression,
    validate: validateExampleAlertType,
    defaultActionMessage: 'Alert [{{ctx.metadata.name}}] has exceeded the threshold',
  };
}
```
Fields of this object `AlertTypeModel` will be mapped properly in UI below.

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

```
This alert type form becomes available, when the card of `Example Alert Type` is selected.
Each expression word here is `EuiExpression` component and implement the basic aggregation, grouping and comparison methods.
Expression components, which can be embed to different alert types is described here [Common expression components](#common-expression-components).

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

4. Extend registration code with the new alert type register in the file `x-pack/legacy/plugins/triggers_actions_ui/np_ready/public/application/components/builtin_alert_types/index.ts`
```
import { getAlertType as getExampledAlertType } from './example';
...

...
alertTypeRegistry.register(getExampledAlertType());
```

After this four steps new `Example Alert Type` is available in UI of Create flyout:
![Example Alert Type is in the select cards list](https://i.imgur.com/j71AEQV.png)

Click on select cart for `Example Alert Type` will open expression form that was created in step 2:
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

`aggType` - alert type property that will be set to the selected aggregation type
`customAggTypesOptions` - (optional) list of aggregation types that will replace the default one defined under constants `x-pack/legacy/plugins/triggers_actions_ui/np_ready/public/common/constants/aggregation_types.ts`
`onChangeSelectedAggType` - event handler that will be excuted on change of selected aggregation type
`popupPosition` - (optional) and allows to change a position of the popup in the wide or small window space.

### OF expression component

![OF](https://i.imgur.com/4MC8Kbb.png)

OF expression is available if aggregation type require selecting data fields for aggregating.

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

`aggType` - alert type property that will be set to the selected aggregation type
`aggField` - alert type property that will be set to the selected aggregation field
`errors` - list errors definition for the fields that should be validated. Can contains only aggField.
`onChangeSelectedAggField` - event handler that will be excuted on change of selected aggregation field.
`fields` - fields list that will be available in the OF dropdow.
`customAggTypesOptions` - (optional) list of aggregation types that will replace the default one defined under constants `x-pack/legacy/plugins/triggers_actions_ui/np_ready/public/common/constants/aggregation_types.ts`
`popupPosition` - (optional) and allows to change a position of the popup in the wide or small window space.

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

`groupBy` - alert type property that will be set to the selected groupBy
`termSize` - alert type property that will be set to the selected termSize
`termField` - alert type property that will be set to the selected termField
`errors` - list errors definition for the alert type fields that should be validated under this current expression. Can contains only termSize and termField.
`onChangeSelectedTermSize` - event handler that will be excuted on change of selected term size.
`onChangeSelectedTermField` - event handler that will be excuted on change of selected term field.
`onChangeSelectedGroupBy` - event handler that will be excuted on change of selected group by.
`fields` - fields list that will be available for the `termField` dropdow.
`customGroupByTypes` - (optional) list of group by types that will replace the default one defined under constants `x-pack/legacy/plugins/triggers_actions_ui/np_ready/public/common/constants/group_by_types.ts`
`popupPosition` - (optional) and allows to change a position of the popup in the wide or small window space.

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

`timeWindowSize` - alert type property that will be set to the selected timeWindowSize
`timeWindowUnit` - alert type property that will be set to the selected timeWindowUnit
`errors` - list errors definition for the alert type fields that should be validated under this current expression. Can contains only timeWindowSize.
`onChangeWindowSize` - event handler that will be excuted on change of selected window size.
`onChangeWindowUnit` - event handler that will be excuted on change of selected window unit.
`popupPosition` - (optional) and allows to change a position of the popup in the wide or small window space.

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

`thresholdComparator` - alert type property that will be set to the selected thresholdComparator
`threshold` - alert type property that will be put to the threshold array.
`errors` - list errors definition for the alert type fields that should be validated under this current expression. Can contains only timeWindowSize.
`onChangeSelectedThresholdComparator` - event handler that will be excuted on change of selected threshold comparator.
`onChangeSelectedThreshold` - event handler that will be excuted on change of selected threshold.
`customComparators` - (optional) list of comparators that will replace the default one defined under constants `x-pack/legacy/plugins/triggers_actions_ui/np_ready/public/common/constants/comparators.ts`
`popupPosition` - (optional) and allows to change a position of the popup in the wide or small window space.

## Embed Create Alert flyout to Kibana plugins

To embed Create Alert flyout to any place in Kibana the next code should be specified under the React component file:
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
    addFlyoutVisible: alertFlyoutVisible,
    setAddFlyoutVisibility: setAlertFlyoutVisibility,
    http,
    actionTypeRegistry: triggers_actions_ui.actionTypeRegistry,
    alertTypeRegistry: triggers_actions_ui.alertTypeRegistry,
    toastNotifications: toasts,
    uiSettings,
    charts,
    dataFieldsFormats,
  }}
>
  <AlertAdd consumer={'watcher'}  />
</AlertsContextProvider>
```

AlertAdd Props definition:
```
interface AlertAddProps {
  consumer: string;
  alertTypeId?: string;
  canChangeTrigger?: boolean;
}
```
`consumer` - name of the plugin, which creating an alert
`alertTypeId` - optional property to predefine alert type
`canChangeTrigger` - optional property that hide change alert type possibility (only predefined will be an option)

AlertsContextProvider value options:
```
export interface AlertsContextValue {
  addFlyoutVisible: boolean;
  setAddFlyoutVisibility: React.Dispatch<React.SetStateAction<boolean>>;
  reloadAlerts?: () => Promise<void>;
  http: HttpSetup;
  alertTypeRegistry: TypeRegistry<AlertTypeModel>;
  actionTypeRegistry: TypeRegistry<ActionTypeModel>;
  uiSettings?: IUiSettingsClient;
  toastNotifications?: Pick<
    ToastsApi,
    'get$' | 'add' | 'remove' | 'addSuccess' | 'addWarning' | 'addDanger' | 'addError'
  >;
  charts?: ChartsPluginSetup;
  dataFieldsFormats?: Pick<FieldFormatsRegistry, 'register'>;
}
```
`addFlyoutVisible` - visibility state of the Create Alert flyout
`setAddFlyoutVisibility` - function for changing visibility state of the Create Alert flyout
`reloadAlerts` - otional function which will be executed if alert was saved sucsessfuly
`http` - HttpSetup needed for API calls
`alertTypeRegistry` - registry for alert types
`actionTypeRegistry` - registry for action types
`uiSettings` - optional property which is needed to display visualization of alert type expression
`toastNotifications` - optional toasts
`charts` - optional property which is needed to display visualization of alert type expression
`dataFieldsFormats` - optional property which is needed to display visualization of alert type expression

## Build and register Action Types

Kibana ships with a set of built-in action types UI:

|Type|Id|Description|
|---|---|---|
|[Server log](#server-log)|`.log`|Logs messages to the Kibana log using `server.log()`|
|[Email](#email)|`.email`|Sends an email using SMTP|
|[Slack](#slack)|`.slack`|Posts a message to a slack channel|
|[Index](#index)|`.index`|Indexes document(s) into Elasticsearch|
|[Webhook](#webhook)|`.webhook`|Send a payload to a web service using HTTP POST or PUT|
|[PagerDuty](#pagerduty)|`.pagerduty`|Trigger, resolve, or acknowlege an incident to a PagerDuty service|

### Server log

