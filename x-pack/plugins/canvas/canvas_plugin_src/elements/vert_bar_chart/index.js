import header from './header.png';

export const verticalBarChart = () => ({
  name: 'verticalBarChart',
  displayName: 'Vertical Bar Chart',
  help: 'A customizable vertical bar chart',
  image: header,
  expression: `filters
| demodata
| pointseries x="project" y="size(cost)" color="project"
| plot defaultStyle={seriesStyle bars=0.75} legend=false
| render`,
});
