import header from './header.png';

export const table = () => ({
  name: 'table',
  displayName: 'Data Table',
  help: 'A scrollable grid for displaying data in a tabular format',
  image: header,
  expression: `filters
| demodata
| table
| render`,
});
