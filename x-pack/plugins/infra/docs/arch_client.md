# Client Architecture

All rules described in the [server-side architecture documentation](docs/arch.md) apply to the client as well. As shown below, the directory structure additionally accommodates the front-end-specific concepts like components and containers.

## Apps

The `apps` folder contains the entry point for the UI code, such as for use in Kibana or testing.

## Components

- Components should be stateless wherever possible with pages and containers holding state.
- Small (less than ~30 lines of JSX and less than ~120 lines total) components should simply get their own file.
- If a component gets too large to reason about, and/or needs multiple child components that are only used in this one place, place them all in a folder.
- All components, please use Styled-Components. This also applies to small tweaks to EUI, just use `styled(Component)` and the `attrs` method for always used props. For example:

```jsx
export const Toolbar = styled(EuiPanel).attrs(() => ({
  paddingSize: 'none',
  grow: false,
}))`
  margin: -2px;
`;
```

However, components that tweak EUI should go into `/public/components/eui/${componentName}`.

If using an EUI component that has not yet been typed, types should be placed into `/types/eui.d.ts`

## Containers (Also: [see GraphQL docs](docs/graphql.md))

- HOC's based on Apollo.
- One folder per data type e.g. `host`. Folder name should be singular.
- One file per query type.

## Pages

- Ideally one file per page, if more files are needed, move into folder containing the page and a layout file.
- Pages are class based components.
- Should hold most state, and any additional route logic.
- Are the only files where components are wrapped by containers. For example:

```jsx
// Simple usage
const FancyLogPage = withSearchResults(class FancyLogPage extends React.Component<FancyLogPageProps> {
  render() {
    return (
      <>
        <Toolbar />
        <LogView  searchResults={/* ... */} />
        <SearchBar />
      <>
    );
  }
});
```

OR, for more complex scenarios:

```jsx
// Advanced usage
const ConnectedToolbar = compose(
  withTimeMutation,
  withCurrentTime
)(Toolbar);

const ConnectedLogView = compose(
  withLogEntries,
  withSearchResults,
)(LogView);

const ConnectedSearchBar = compose(
  withSearchMutation
)(SearchBar);

interface FancyLogPageProps {}

class FancyLogPage extends React.Component<FancyLogPageProps> {
  render() {
    return (
      <>
        <ConnectedToolbar />
        <ConnectedLogView />
        <ConnectedSearchBar />
      <>
    );
  }
};
```

## Transforms

- If you need to do some complex data transforms, it is better to put them here than in a utility or lib. Simpler transforms are probably easier to keep in a container.
- One file per transform

## File structure

```
|-- infra-ui
    |-- common
    |   |-- types.ts
    |
    |-- public
    |   |-- components //
    |   |   |-- eui // staging area for eui customizations before pushing upstream
    |   |   |-- layout // any layout components should be placed in here
    |   |   |-- button.tsx
    |   |   |-- mega_table // Where mega table is used directly with a data prop, not a composable table
    |   |       |-- index.ts
    |   |       |-- row.tsx
    |   |       |-- table.tsx
    |   |       |-- cell.tsx
    |   |
    |   |-- containers
    |   |   |-- host
    |   |   |   |-- index.ts
    |   |   |   |-- with_all_hosts.ts
    |   |   |   |-- transforms
    |   |   |       |-- hosts_to_waffel.ts
    |   |   |
    |   |   |-- pod
    |   |       |-- index.ts
    |   |       |-- with_all_pods.ts
    |   |
    |   |-- pages
    |   |   |-- home.tsx // the initial page of a plugin is always the `home` page
    |   |   |-- hosts.tsx
    |   |   |-- logging.tsx
    |   |
    |   |-- utils // utils folder for what utils folders are for ;)
    |   |
    |   |-- lib // covered in [Our code and arch](docs/arch.md)
```
