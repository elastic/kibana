export const areaChart = () => {
  return {
    name: 'areaChart',
    displayName: 'Area Chart',
    help: 'A line chart with a filled body',
    image: require('./header.png'),
    expression: `filters
  | demodata
  | pointseries x="time" y="mean(price)"
  | plot defaultStyle={seriesStyle lines=1 fill=1}
  | render`,
  };
};
