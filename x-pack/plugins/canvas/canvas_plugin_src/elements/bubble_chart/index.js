import header from './header.png';

export const bubbleChart = () => ({
  name: 'bubbleChart',
  displayName: 'Bubble Chart',
  help: 'A customizable bubble chart',
  width: 700,
  height: 300,
  image: header,
  expression: `filters
| demodata
| pointseries x="project" y="sum(price)" color="state" size="size(username)"
| plot defaultStyle={seriesStyle points=5 fill=1}
| render`,
});
