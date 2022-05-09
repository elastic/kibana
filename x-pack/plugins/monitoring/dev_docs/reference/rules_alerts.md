# Rules and Alerts 

## Rule Classes
Rules and their alert states are represented through classes in `/server/alerts`.  Each rule has a unique class and inherits from the `BaseRule`.  Rules are instantiated through the `AlertsFactory` class.

### BaseRule Class 
- contains the executor method for all rules  
- executor calls fetchClusters method, fetchData method on the child class, and processData method
- processData creates the alert instances and executes alert actions
Handles firing alerts per node, cluster, or index
executeActions 
### Rule class 
- each rule has its own class that is instantiated with properties unique to the rule
- the fetchData method is called from the execute method on the `BaseRule`.  It fetches data and determines whether the rule condition has been met

## Instantiating Rule Classes
Rules are instantiated during registration, creation, and when getting an existing rule and its alert states

### Rule registration
During plugin setup rules are registered by instantiating each rule class by calling `AlertsFactory.getAll()` and getting the rule type options by calling `getRuleType` method on each class

### Rule creation
- all default rules are created with route `/api/monitoring/v1/alerts/enable`
- rules are created by calling `AlertsFactory.getAll()` and then `createIfDoesNotExist`
- all rules are created with default server log action
- we delete any existing legacy watcher alerts before creating new rules

### Rule creation with alerts
Periodically a status call from the UI is made to `/api/monitoring/v1/alert/{clusterUuid}/status` (`fetchStatus`). Queries for existing rules by calling `AlertsFactory.getByType` and returns array of rule classes nested by type.  Then fetches the state of each rule and returns to the UI an object of rules by type and its alert states if any.

## Alert data in the UI
Any view that displays alert data in some way will have a `fetchAlerts` in the `getPageData` callback sent to `PageTemplate` that is called periodically.  Alerts will be part of the state passed to child components.

Alerts are mainly represented through menus available when clicking on badges located in various places in the UI. They represent Rules when in setup mode and Alerts when not in setup mode.  They can be organized by category `/public/alerts/lib/get_alert_panels_by_category.tsx` or node `/public/alerts/lib/get_alert_panels_by_node.tsx`. 

## Behavior

### Management
- rules created via modal or dropdown menu within the app
- creating rules within the app creates ALL rules with all default options 
- a single rule or a single rule with custom options can only be created in Management
- rules can be modified/customized in Stack Monitoring or Management
- rules can only be deleted in Management
- multiple rules of the same type can exist
- creating all rules does not override existing rules

### Alerting
Alerts are fired in 3 contexts: Node, Cluster, Index 

#### Node context
- CPU Usage
- Disk Usage
- Memory Usage
- Missing Monitoring Data
- Threadpool search rejections
- Threadpool write rejections
#### Cluster context 
- CCR Read Exceptions
- Cluster Health
- Elasticsearch Version Mismatch
- Logstash Version Mismatch
- Kibana Version Mismatch
- License Expiration
- Nodes Changed
#### Index context
- Shard Size


## Notable Features Between Versions
### 7.15
- [multiple types of the same rule](https://github.com/elastic/kibana/pull/106457)
- [allow default rule to be created/managed in Management](https://github.com/elastic/kibana/pull/106457)
### 7.14 
- [alert per node/index instead of per cluster](https://github.com/elastic/kibana/pull/102544)
- [stops auto creating default rule, remove allowedSpaces config](https://github.com/elastic/kibana/pull/101565)
### 7.13
- [stops creating alerts in all spaces and looks at config monitoring.cluster_alerts.allowedSpaces](https://github.com/elastic/kibana/pull/99128)
### 7.12.0
- [disable and delete deprecated cluster based watcher alerts](https://github.com/elastic/kibana/pull/85047)


