TODO: update with additional extension points (Integration app, add agent flyout etc.)
# Fleet UI Extensions

Fleet's Kibana UI supports two types of UI extensions:

- Custom UI components
- Navigation redirection

More information about these can be found below.


## Custom UI Components

Custom UI component extension can be registered with Fleet using the Plugin's `#start()` exposed interface, which contains a method named `registerExtension()`. In order to take advantage of these extension points, a Kibana plugin must set a dependency on Fleet so that the interface can be made available.

Here is an example Security Solution's Endpoint takes advantage of this functionality to register several custom UI extensions:

```typescript
export class Plugin {
  //...
  start(core: CoreStart, startDep: StartDependencies) {
    const { registerExtension } = startDep.fleet;
    
    registerExtension({
      package: 'endpoint',
      view: 'package-policy-edit',
      component: getLazyEndpointPolicyEditExtension(core, plugins),
    });

    registerExtension({
      package: 'endpoint',
      view: 'package-policy-create',
      component: LazyEndpointPolicyCreateExtension,
    });

    registerExtension({
      package: 'endpoint',
      view: 'package-detail-custom',
      component: getLazyEndpointPackageCustomExtension(core, plugins),
    });
  }
  //...
}
```

> The code above lives in `x-pack/plugins/security_solution/public/plugin.tsx`

For a list of supported Fleet UI extensions, see the `UIExtensionPoint` and associated Union types defined here: `x-pack/plugins/fleet/public/types/ui_extensions.ts`.




## Navigation Redirection

In order to support better user flows, some of Fleet's pages support changing the behaviour of the certain links and/or button clicks and to where they redirect if a user clicks on it. This type of UI extension does not need a Plugin level dependency on Fleet - it utilizes Route state via `react-router` along with Kibana's `core.application.navigateToApp()` method thus any kibana plugin can take advantage of it.

Here is an example of how to create a link that redirects the user to Fleet's Agent Policy detail page with the Agent Enroll flyout opened, and once the user clicks "done", they are redirected back to the originating page:

```typescript jsx
const LinkToAgentEnroll = () => {
  const { services } = useKibana();
  const handleLinkClick = useCallback((ev) => {
    ev.preventDefault();
    
    const fleetPolicyPageRouteState: AgentPolicyDetailsDeployAgentAction = {
      onDoneNavigateTo: [
        'my-app-plugin-id',
        { path: 'the/page/I/am/currently/on' },
      ],
    };
    
    services.application.navigateTo(
      'fleet',
      {
        path: '#/policies/123-some-uuid-321?openEnrollmentFlyout=true',
        state: fleetPolicyPageRouteState
      }
    );
  }, [services.application.navigateTo]);
  
  return <EuiLink onClick={handleLinkClick}>Enroll an agent</EuiLink>
}
```

For a list of supported Fleet pages, see the type `AnyIntraAppRouteState` and its associated Union types in `x-pack/plugins/fleet/public/types/intra_app_route_state.ts`
