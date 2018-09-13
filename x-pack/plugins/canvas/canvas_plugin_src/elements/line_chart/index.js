import header from './header.png';

export const lineChart = () => ({
  name: 'lineChart',
  displayName: 'Line Chart',
  help: 'A customizable line chart',
  image: header,
  expression: `filters
| demodata
| pointseries x="time" y="mean(price)"
| plot defaultStyle={seriesStyle lines=3}
| render`,
});
