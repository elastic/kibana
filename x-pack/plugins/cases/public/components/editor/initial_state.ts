/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const initialState = `Hey! Look at this **viz**:

!{lens{"timeRange":{"from":"now/d","to":"now/d","mode":"relative"},"attributes":{"title":"","visualizationType":"lnsXY","type":"lens","references":[{"type":"index-pattern","id":"390329a2-e67a-43b7-9c2b-72089a06b259","name":"indexpattern-datasource-layer-36d070f1-6db5-4925-9352-738f5eaa1da9"}],"state":{"visualization":{"legend":{"isVisible":true,"position":"right"},"valueLabels":"hide","fittingFunction":"None","axisTitlesVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"tickLabelsVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"labelsOrientation":{"x":0,"yLeft":0,"yRight":0},"gridlinesVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"preferredSeriesType":"bar_stacked","layers":[{"layerId":"36d070f1-6db5-4925-9352-738f5eaa1da9","accessors":["d47f5950-9fee-480f-920b-9e1dcb8a2534"],"position":"top","seriesType":"bar_stacked","showGridlines":false,"layerType":"data","xAccessor":"5f3a0416-007e-49ab-835c-e79ab9f1fa5a"}]},"query":{"query":"","language":"kuery"},"filters":[],"datasourceStates":{"formBased":{"layers":{"36d070f1-6db5-4925-9352-738f5eaa1da9":{"columns":{"5f3a0416-007e-49ab-835c-e79ab9f1fa5a":{"label":"cases.created_at","dataType":"date","operationType":"date_histogram","sourceField":"cases.created_at","isBucketed":true,"scale":"interval","params":{"interval":"auto","includeEmptyRows":true,"dropPartials":false}},"d47f5950-9fee-480f-920b-9e1dcb8a2534":{"label":"Count of records","dataType":"number","operationType":"count","isBucketed":false,"scale":"ratio","sourceField":"___records___","params":{"emptyAsNull":true}}},"columnOrder":["5f3a0416-007e-49ab-835c-e79ab9f1fa5a","d47f5950-9fee-480f-920b-9e1dcb8a2534"],"incompleteColumns":{},"sampling":1}}},"indexpattern":{"layers":{}},"textBased":{"layers":{}}},"internalReferences":[],"adHocDataViews":{}}}}}


and check this code block

\`\`\`
export function $createLensNode(): LensNode {
  return new LensNode();
}
\`\`\`
`;
