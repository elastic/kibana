# Kea State Management
Enterprise Search uses [Kea.js](https://github.com/keajs/kea) to manage our React/Redux state for us. Kea state is handled in our `*Logic` files and exposes [values](https://kea.js.org/docs/guide/concepts#values) and [actions](https://kea.js.org/docs/guide/concepts#actions) for our components to get and set state with.

To make sure we have a consistent way of dealing with state, we have a few guidelines we follow. Note that these are guidelines, not hard and fast rules, and you can deviate from them if it makes sense. In addition, there's a lot of legacy code in our codebase that does not adhere to these standards. New code is expected to follow these guidelines as much as possible.

## Only use Kea when necessary

Redux and Kea are excellent tools for state management in complex applications, to maintain consistent state across different components and decouple their functionality from APIs and complex application state considerations. However, overuse of state management tools can have the opposite effect of creating a highly-coupled application where any changes to the state logic have unintended consequences across the codebase. In addition, components that rely on Kea are harder to test than those that don't. Be mindful of where you apply these tools.

A few indications your component does need Kea or complex state management:
- Your component is not interactive and only displays data it is passed from a parent
- Your component's interactivity is limited to the way it displays its data (eg: toggling between different views)
- Your component's interactivity is limited to a small slice of the larger application

A few indications you do need Kea:
- Your component has no logical parent to inherit its data from
- Your component needs to pull data from a number of different APIs or data sources
- Your component's input data had to travel down through multiple components that only passed it along
- Your component's interactivity alters state that other components rely on
- Your component directly interacts with APIs, particularly when fetching data
- You're pushing events up or down through multiple components - avoid this and use Kea wherever possible

Slicing up components into smaller chunks, designing clear interfaces for those components and lifting state up can be a better solution than making state global through Kea.

## Separate API calls from components

State management tools are most powerful when used to coordinate state across an entire application, or large slices of that application. To do that well, state needs to be shared and it needs to be clear where in the existing state to find what information. We do this by separating API data from component data.

This means API interactions and their data should live in their own logic files, and the resulting data and API status should be imported by other logic files or directly by components consuming that data. Those API logic files should contain all interactions with APIs, and the current status of those API requests. We have a util function to help you create those, located in [create_api_logic.ts](public/applications/shared/api_logic/create_api_logic.ts). You can grab the `status`, `data` and `error` values from any API created with that util. And you can listen to the `makeRequest`, `apiSuccess`, `apiError` and `apiReset` actions in other listeners.

You will need to provide a function that actually makes the api call, as well as the logic path. The function will need to accept and return a single object, not separate values.

```typescript
export const addCustomSource = async ({
  name,
  baseServiceType,
}: {
  name: string;
  baseServiceType?: string;
}) => {
  const { isOrganization } = AppLogic.values;
  const route = isOrganization
    ? '/internal/workplace_search/org/create_source'
    : '/internal/workplace_search/account/create_source';

  const params = {
    service_type: 'custom',
    name,
    base_service_type: baseServiceType,
  };
  const source = await HttpLogic.values.http.post<CustomSource>(route, {
    body: JSON.stringify(params),
  });
  return { source };
};

export const AddCustomSourceApiLogic = createApiLogic(
  ['add_custom_source_api_logic'],
  addCustomSource
);
```

The types used in that util can be found in our [common Enterprise Search types file](common/types/api.ts).

## Import actions and values from API logic files into component and view logic.

Once you have an API interactions file set up, components and other Kea logic files can import the values from those files to build their own logic. Use the Kea 'connect' functionality to do this, as the auto-connect functionality has a few bugs and was removed in Kea 3.0. This allows you to read the status and value of an API, react to any API events, and abstract those APIs away from the components. Those components can now become more functional and reactive to the current state of the application, rather than to directly responding to API events.

You can connect logic files by adding a `connect` property to your Kea logic function, specifying the specific actions and values you want to import into your own logic. You can be selective there, and don't need to import all actions and values--only the ones you'll actually use. You can then access those actions and values directly under their own name in your new logic function.

```typescript
export const AddCustomSourceLogic = kea<
  MakeLogicType<AddCustomSourceValues, AddCustomSourceActions, AddCustomSourceProps>
>({
  connect: {
    actions: [AddCustomSourceApiLogic, ['makeRequest', 'apiSuccess', ]],
    values: [AddCustomSourceApiLogic, ['status']],
  },
  path: ['enterprise_search', 'workplace_search', 'add_custom_source_logic'],
  actions: {
    createContentSource: true,
    setNewCustomSource: (data) => data,
  },
  listeners: ({ actions, values, props }) => ({
    createContentSource: () => {
      const { customSourceNameValue } = values;
      const { baseServiceType } = props;
      actions.makeRequest({ source: customSourceNameValue, baseServiceType });
    },
    addSourceSuccess: (customSource: CustomSource) => {
      actions.setNewCustomSource(customSource);
    },
  }),
  selectors: {
    buttonLoading: [
      (selectors) => [selectors.status],
      (apiStatus) => status === 'LOADING',
    ],
  },
});
```

You'll have to add the imported the actions and values types you're already using for your function, preferably by importing the types off the imported logic, so TypeScript can warn you if you're misusing the function.
## Keep your logic files small

Using the above methods, you can keep your logic files small and isolated. Keep API calls separate from view and component logic. Keep the amount of logic you're processing limited per file. If your logic file starts exceeding about 150 lines of code, you should start thinking about splitting it up into separate chunks, if possible.

Splitting up logic helps keep your application logic manageable and somewhat isolated, it helps keep your logic files testable, and it helps you understand what is happening in each logic file.

## When connecting logic files, be explicit

Kea has a feature where it will auto-connect logic files when you use actions and values from one file in another. This works, but has led to bugs in the past. Because it's generally better to be explicit than implicit, we prefer making these links explicit as well. Use the 'connect' feature on a Kea logic function to connect two different logics together. See above for an example.
