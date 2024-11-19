# **Security Solution ESS Plugin**

## **Table of Contents**
- [Introduction](#introduction)
- [Purpose](#purpose)
- [Architecture](#architecture)
- [Contributing](#contributing)
- [License](#license)

## **Introduction**
The `security_solution_ess` plugin is an internal plugin for Kibana's Security Solution, designed to encapsulate ESS-specific logic. 
This plugin is only enabled when the application is built for stateful deployments (ESS or on-prem), keeping the main `security_solution` plugin clean and agnostic of the offering model.

> The term ESS used by this plugin is not strictly referring to Cloud deployments, it's used to refer to all stateful deployments (non-serverless), including on-prem instances.

## **Purpose**
The primary goal of the `security_solution_ess` plugin is to:
- Isolate ess-specific code and configuration from the main `security_solution` plugin.
- Enable seamless integration with the non-serverless environment without affecting the serverless build of the Security Solution.
- Provide a modular approach by encapsulating ess-related functionality, thereby maintaining the codebase's cleanliness and modularity.

## **Architecture**
The `security_solution_ess` plugin depends on the main `security_solution` plugin, it can import code from it though the use of agnostic packages is preferred, and they interact through the plugin lifecycle contract. 
This architecture allows the `security_solution_ess` plugin to:
- Modify the behavior of the main plugin by providing ess-specific content.
- Ensure that the `security_solution` plugin remains offering-agnostic by using APIs for ess-specific behavior only when necessary.

### **Plugin Interaction**
- **Generic Plugin (`security_solution`)**: Exposes an API in its plugin lifecycle contract for components and configurations that depend on the offering.
- **ESS Plugin (`security_solution_ess`)**: Utilizes the exposed API to inject or modify the application according to ess-specific content and logic.
- **Other Plugins**: Other plugins may also expose contract APIs to configure ess-specific content for Security. 

#### **Example**

The following example demonstrates how the `security_solution_ess` plugin interacts with the main `security_solution` plugin via a contract API. 

It exposes a setter to the contract API for `usersUrl`, which is an offering-specific value. The `security_solution_ess` plugin uses these APIs to inject the ess-specific URL into the main plugin.

The `PluginContract` class in the main Security Solution plugin simplifies the usage of contract APIs, storing the values and providing a getter to the application using the Kibana services context.

___security_solution/public/plugin_contract.ts___
```typescript
export class PluginContract {
    usersUrl: string;

    public getStartContract() {
        return {
            setUsersUrl: (url: string) => { 
                this.usersUrl = url;
            }
        };
    }

    public getStartServices() {
        return {
            getUsersUrl: () => this.usersUrl; // available via useKibana().services.getUsersUrl()
        };
    }
}
```

___security_solution_ess/public/plugin.ts___
```typescript
export class Plugin {

    public start(core: CoreStart, deps: SecuritySolutionEssStartDeps) {
        deps.securitySolution.setUsersUrl(deps.application.getUrlForApp('management', { path: 'security/users' }));
    }
}
```

## **Contributing**
If you're looking to contribute to this plugin, please follow the standard contribution guidelines of the Security Solution plugin. Ensure that all changes are tested in a ESS environment.

## **License**
This plugin is licensed under the Elastic License. See the [LICENSE](../../../LICENSE.txt) file for more details.
