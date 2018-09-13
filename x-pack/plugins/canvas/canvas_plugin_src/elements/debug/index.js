import header from './header.png';

export const debug = () => ({
  name: 'debug',
  displayName: 'Debug',
  help: 'Just dumps the configuration of the element',
  image: header,
  expression: `demodata
| render as=debug`,
});
