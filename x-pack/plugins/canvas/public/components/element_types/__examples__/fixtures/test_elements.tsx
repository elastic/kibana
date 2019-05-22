/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { elasticLogo } from '../../../../lib/elastic_logo';

export const testElements = [
  {
    name: 'areaChart',
    displayName: 'Area chart',
    help: 'A line chart with a filled body',
    tags: ['chart'],
    image: elasticLogo,
    expression: `filters
    | demodata
    | pointseries x="time" y="mean(price)"
    | plot defaultStyle={seriesStyle lines=1 fill=1}
    | render`,
  },
  {
    name: 'image',
    displayName: 'Image',
    help: 'A static image',
    tags: ['graphic'],
    image: elasticLogo,
    expression: `image dataurl=null mode="contain"
  | render`,
  },
  {
    name: 'table',
    displayName: 'Data table',
    tags: ['text'],
    help: 'A scrollable grid for displaying data in a tabular format',
    image: elasticLogo,
    expression: `filters
  | demodata
  | table
  | render`,
  },
];

export const testCustomElements = [
  {
    id: 'custom-element-10d625f5-1342-47c9-8f19-d174ea6b65d5',
    name: 'customElement1',
    displayName: 'Custom Element 1',
    help: 'sample description',
    image: elasticLogo,
    content: `{\"selectedNodes\":[{\"id\":\"element-3383b40a-de5d-4efb-8719-f4d8cffbfa74\",\"position\":{\"left\":142,\"top\":146,\"width\":700,\"height\":300,\"angle\":0,\"parent\":null,\"type\":\"element\"},\"expression\":\"filters\\n| demodata\\n| pointseries x=\\\"project\\\" y=\\\"sum(price)\\\" color=\\\"state\\\" size=\\\"size(username)\\\"\\n| plot defaultStyle={seriesStyle points=5 fill=1}\\n| render\",\"ast\":{\"type\":\"expression\",\"chain\":[{\"type\":\"function\",\"function\":\"filters\",\"arguments\":{}},{\"type\":\"function\",\"function\":\"demodata\",\"arguments\":{}},{\"type\":\"function\",\"function\":\"pointseries\",\"arguments\":{\"x\":[\"project\"],\"y\":[\"sum(price)\"],\"color\":[\"state\"],\"size\":[\"size(username)\"]}},{\"type\":\"function\",\"function\":\"plot\",\"arguments\":{\"defaultStyle\":[{\"type\":\"expression\",\"chain\":[{\"type\":\"function\",\"function\":\"seriesStyle\",\"arguments\":{\"points\":[5],\"fill\":[1]}}]}]}},{\"type\":\"function\",\"function\":\"render\",\"arguments\":{}}]}}]}`,
  },
  {
    id: 'custom-element-b22d8d10-6116-46fb-9b46-c3f3340d3aaa',
    name: 'customElement2',
    displayName: 'Custom Element 2',
    help: 'Aenean eu justo auctor, placerat felis non, scelerisque dolor. ',
    image: elasticLogo,
    content: `{\"selectedNodes\":[{\"id\":\"group-dccf4ed7-1593-49a0-9902-caf4d4a4b7f5\",\"position\":{\"left\":250,\"top\":119,\"width\":340,\"height\":517,\"angle\":0,\"parent\":null,\"type\":\"group\"},\"expression\":\"shape fill=\\\"rgba(255,255,255,0)\\\" | render\",\"ast\":{\"type\":\"expression\",\"chain\":[{\"type\":\"function\",\"function\":\"shape\",\"arguments\":{\"fill\":[\"rgba(255,255,255,0)\"]}},{\"type\":\"function\",\"function\":\"render\",\"arguments\":{}}]}},{\"id\":\"element-e2c658ee-7614-4d92-a46e-2b1a81a24485\",\"position\":{\"left\":250,\"top\":405,\"width\":340,\"height\":75,\"angle\":0,\"parent\":\"group-dccf4ed7-1593-49a0-9902-caf4d4a4b7f5\",\"type\":\"element\"},\"expression\":\"filters\\n| demodata\\n| markdown \\\"## Jane Doe\\\" \\n  font={font family=\\\"'Open Sans', Helvetica, Arial, sans-serif\\\" size=14 align=\\\"center\\\" color=\\\"#000000\\\" weight=\\\"normal\\\" underline=false italic=false}\\n| render\",\"ast\":{\"type\":\"expression\",\"chain\":[{\"type\":\"function\",\"function\":\"filters\",\"arguments\":{}},{\"type\":\"function\",\"function\":\"demodata\",\"arguments\":{}},{\"type\":\"function\",\"function\":\"markdown\",\"arguments\":{\"_\":[\"## Jane Doe\"],\"font\":[{\"type\":\"expression\",\"chain\":[{\"type\":\"function\",\"function\":\"font\",\"arguments\":{\"family\":[\"'Open Sans', Helvetica, Arial, sans-serif\"],\"size\":[14],\"align\":[\"center\"],\"color\":[\"#000000\"],\"weight\":[\"normal\"],\"underline\":[false],\"italic\":[false]}}]}]}},{\"type\":\"function\",\"function\":\"render\",\"arguments\":{}}]}},{\"id\":\"element-3d16765e-5251-4954-8e2a-6c64ed465b73\",\"position\":{\"left\":250,\"top\":480,\"width\":340,\"height\":75,\"angle\":0,\"parent\":\"group-dccf4ed7-1593-49a0-9902-caf4d4a4b7f5\",\"type\":\"element\"},\"expression\":\"filters\\n| demodata\\n| markdown \\\"### Developer\\\" \\n  font={font family=\\\"'Open Sans', Helvetica, Arial, sans-serif\\\" size=14 align=\\\"center\\\" color=\\\"#000000\\\" weight=\\\"normal\\\" underline=false italic=false}\\n| render css=\\\".canvasRenderEl h3 {\\ncolor: #444444;\\n}\\\"\",\"ast\":{\"type\":\"expression\",\"chain\":[{\"type\":\"function\",\"function\":\"filters\",\"arguments\":{}},{\"type\":\"function\",\"function\":\"demodata\",\"arguments\":{}},{\"type\":\"function\",\"function\":\"markdown\",\"arguments\":{\"_\":[\"### Developer\"],\"font\":[{\"type\":\"expression\",\"chain\":[{\"type\":\"function\",\"function\":\"font\",\"arguments\":{\"family\":[\"'Open Sans', Helvetica, Arial, sans-serif\"],\"size\":[14],\"align\":[\"center\"],\"color\":[\"#000000\"],\"weight\":[\"normal\"],\"underline\":[false],\"italic\":[false]}}]}]}},{\"type\":\"function\",\"function\":\"render\",\"arguments\":{\"css\":[\".canvasRenderEl h3 {\\ncolor: #444444;\\n}\"]}}]}},{\"id\":\"element-624675cf-46e9-4545-b86a-5409bbe53ac1\",\"position\":{\"left\":250,\"top\":555,\"width\":340,\"height\":81,\"angle\":0,\"parent\":\"group-dccf4ed7-1593-49a0-9902-caf4d4a4b7f5\",\"type\":\"element\"},\"expression\":\"filters\\n| demodata\\n| markdown \\n  \\\"Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec vel sollicitudin mauris, ut scelerisque urna. \\\" \\n  font={font family=\\\"'Open Sans', Helvetica, Arial, sans-serif\\\" size=14 align=\\\"center\\\" color=\\\"#000000\\\" weight=\\\"normal\\\" underline=false italic=false}\\n| render\",\"ast\":{\"type\":\"expression\",\"chain\":[{\"type\":\"function\",\"function\":\"filters\",\"arguments\":{}},{\"type\":\"function\",\"function\":\"demodata\",\"arguments\":{}},{\"type\":\"function\",\"function\":\"markdown\",\"arguments\":{\"_\":[\"Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec vel sollicitudin mauris, ut scelerisque urna. \"],\"font\":[{\"type\":\"expression\",\"chain\":[{\"type\":\"function\",\"function\":\"font\",\"arguments\":{\"family\":[\"'Open Sans', Helvetica, Arial, sans-serif\"],\"size\":[14],\"align\":[\"center\"],\"color\":[\"#000000\"],\"weight\":[\"normal\"],\"underline\":[false],\"italic\":[false]}}]}]}},{\"type\":\"function\",\"function\":\"render\",\"arguments\":{}}]}},{\"id\":\"element-c2916246-26dd-4c65-91c6-d1ad3f1791ee\",\"position\":{\"left\":293,\"top\":119,\"width\":254,\"height\":252,\"angle\":0,\"parent\":\"group-dccf4ed7-1593-49a0-9902-caf4d4a4b7f5\",\"type\":\"element\"},\"expression\":\"image dataurl={asset \\\"asset-0c6f377f-771e-432e-8e2e-15c3e9142ad6\\\"} mode=\\\"contain\\\"\\n| render\",\"ast\":{\"type\":\"expression\",\"chain\":[{\"type\":\"function\",\"function\":\"image\",\"arguments\":{\"dataurl\":[{\"type\":\"expression\",\"chain\":[{\"type\":\"function\",\"function\":\"asset\",\"arguments\":{\"_\":[\"asset-0c6f377f-771e-432e-8e2e-15c3e9142ad6\"]}}]}],\"mode\":[\"contain\"]}},{\"type\":\"function\",\"function\":\"render\",\"arguments\":{}}]}}]}`,
  },
  {
    id: 'custom-element-',
    name: 'customElement3',
    displayName: 'Custom Element 3',
    help:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce lobortis aliquet arcu ut turpis duis.',
    image: elasticLogo,
    content: `{\"selectedNodes\":[{\"id\":\"group-dccf4ed7-1593-49a0-9902-caf4d4a4b7f5\",\"position\":{\"left\":250,\"top\":119,\"width\":340,\"height\":517,\"angle\":0,\"parent\":null,\"type\":\"group\"},\"expression\":\"shape fill=\\\"rgba(255,255,255,0)\\\" | render\",\"ast\":{\"type\":\"expression\",\"chain\":[{\"type\":\"function\",\"function\":\"shape\",\"arguments\":{\"fill\":[\"rgba(255,255,255,0)\"]}},{\"type\":\"function\",\"function\":\"render\",\"arguments\":{}}]}},{\"id\":\"element-e2c658ee-7614-4d92-a46e-2b1a81a24485\",\"position\":{\"left\":250,\"top\":405,\"width\":340,\"height\":75,\"angle\":0,\"parent\":\"group-dccf4ed7-1593-49a0-9902-caf4d4a4b7f5\",\"type\":\"element\"},\"expression\":\"filters\\n| demodata\\n| markdown \\\"## Jane Doe\\\" \\n  font={font family=\\\"'Open Sans', Helvetica, Arial, sans-serif\\\" size=14 align=\\\"center\\\" color=\\\"#000000\\\" weight=\\\"normal\\\" underline=false italic=false}\\n| render\",\"ast\":{\"type\":\"expression\",\"chain\":[{\"type\":\"function\",\"function\":\"filters\",\"arguments\":{}},{\"type\":\"function\",\"function\":\"demodata\",\"arguments\":{}},{\"type\":\"function\",\"function\":\"markdown\",\"arguments\":{\"_\":[\"## Jane Doe\"],\"font\":[{\"type\":\"expression\",\"chain\":[{\"type\":\"function\",\"function\":\"font\",\"arguments\":{\"family\":[\"'Open Sans', Helvetica, Arial, sans-serif\"],\"size\":[14],\"align\":[\"center\"],\"color\":[\"#000000\"],\"weight\":[\"normal\"],\"underline\":[false],\"italic\":[false]}}]}]}},{\"type\":\"function\",\"function\":\"render\",\"arguments\":{}}]}},{\"id\":\"element-3d16765e-5251-4954-8e2a-6c64ed465b73\",\"position\":{\"left\":250,\"top\":480,\"width\":340,\"height\":75,\"angle\":0,\"parent\":\"group-dccf4ed7-1593-49a0-9902-caf4d4a4b7f5\",\"type\":\"element\"},\"expression\":\"filters\\n| demodata\\n| markdown \\\"### Developer\\\" \\n  font={font family=\\\"'Open Sans', Helvetica, Arial, sans-serif\\\" size=14 align=\\\"center\\\" color=\\\"#000000\\\" weight=\\\"normal\\\" underline=false italic=false}\\n| render css=\\\".canvasRenderEl h3 {\\ncolor: #444444;\\n}\\\"\",\"ast\":{\"type\":\"expression\",\"chain\":[{\"type\":\"function\",\"function\":\"filters\",\"arguments\":{}},{\"type\":\"function\",\"function\":\"demodata\",\"arguments\":{}},{\"type\":\"function\",\"function\":\"markdown\",\"arguments\":{\"_\":[\"### Developer\"],\"font\":[{\"type\":\"expression\",\"chain\":[{\"type\":\"function\",\"function\":\"font\",\"arguments\":{\"family\":[\"'Open Sans', Helvetica, Arial, sans-serif\"],\"size\":[14],\"align\":[\"center\"],\"color\":[\"#000000\"],\"weight\":[\"normal\"],\"underline\":[false],\"italic\":[false]}}]}]}},{\"type\":\"function\",\"function\":\"render\",\"arguments\":{\"css\":[\".canvasRenderEl h3 {\\ncolor: #444444;\\n}\"]}}]}},{\"id\":\"element-624675cf-46e9-4545-b86a-5409bbe53ac1\",\"position\":{\"left\":250,\"top\":555,\"width\":340,\"height\":81,\"angle\":0,\"parent\":\"group-dccf4ed7-1593-49a0-9902-caf4d4a4b7f5\",\"type\":\"element\"},\"expression\":\"filters\\n| demodata\\n| markdown \\n  \\\"Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec vel sollicitudin mauris, ut scelerisque urna. \\\" \\n  font={font family=\\\"'Open Sans', Helvetica, Arial, sans-serif\\\" size=14 align=\\\"center\\\" color=\\\"#000000\\\" weight=\\\"normal\\\" underline=false italic=false}\\n| render\",\"ast\":{\"type\":\"expression\",\"chain\":[{\"type\":\"function\",\"function\":\"filters\",\"arguments\":{}},{\"type\":\"function\",\"function\":\"demodata\",\"arguments\":{}},{\"type\":\"function\",\"function\":\"markdown\",\"arguments\":{\"_\":[\"Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec vel sollicitudin mauris, ut scelerisque urna. \"],\"font\":[{\"type\":\"expression\",\"chain\":[{\"type\":\"function\",\"function\":\"font\",\"arguments\":{\"family\":[\"'Open Sans', Helvetica, Arial, sans-serif\"],\"size\":[14],\"align\":[\"center\"],\"color\":[\"#000000\"],\"weight\":[\"normal\"],\"underline\":[false],\"italic\":[false]}}]}]}},{\"type\":\"function\",\"function\":\"render\",\"arguments\":{}}]}},{\"id\":\"element-c2916246-26dd-4c65-91c6-d1ad3f1791ee\",\"position\":{\"left\":293,\"top\":119,\"width\":254,\"height\":252,\"angle\":0,\"parent\":\"group-dccf4ed7-1593-49a0-9902-caf4d4a4b7f5\",\"type\":\"element\"},\"expression\":\"image dataurl={asset \\\"asset-0c6f377f-771e-432e-8e2e-15c3e9142ad6\\\"} mode=\\\"contain\\\"\\n| render\",\"ast\":{\"type\":\"expression\",\"chain\":[{\"type\":\"function\",\"function\":\"image\",\"arguments\":{\"dataurl\":[{\"type\":\"expression\",\"chain\":[{\"type\":\"function\",\"function\":\"asset\",\"arguments\":{\"_\":[\"asset-0c6f377f-771e-432e-8e2e-15c3e9142ad6\"]}}]}],\"mode\":[\"contain\"]}},{\"type\":\"function\",\"function\":\"render\",\"arguments\":{}}]}}]}`,
  },
];
