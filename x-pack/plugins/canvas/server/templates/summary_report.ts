/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { CanvasTemplate } from '../../types';

export const summary: CanvasTemplate = {
  id: 'workpad-template-6181471b-147d-4397-a0d3-1c0f1600fa12',
  name: 'Summary',
  help: 'Infographic-style report with live charts',
  tags: ['report'],
  template_key: 'summary-report',
  template: {
    name: 'Summary',
    width: 1100,
    height: 2570,
    page: 0,
    pages: [
      {
        id: 'page-28d2523e-aa4d-4134-8092-b849835b620f',
        style: {
          background: '#FFF',
        },
        transition: {},
        elements: [
          {
            id: 'element-7e937714-3a57-4d41-bcc7-859b2d2db497',
            position: {
              left: -1.375,
              top: -2.5,
              width: 1101.75,
              height: 115,
              angle: 0,
              parent: null,
            },
            expression:
              'shape "square" fill="#69707D" border="rgba(255,255,255,0)" borderWidth=0 maintainAspect=false\n| render css=".canvasRenderEl {\n\n}" containerStyle={containerStyle}',
          },
          {
            id: 'element-8cbe96d4-f555-4891-8f23-ef6cd679d9cf',
            position: {
              left: 31.75,
              top: 1186,
              width: 1034.5,
              height: 421,
              angle: 0,
              parent: null,
            },
            expression:
              'shape "square" fill="rgba(255,255,255,0)" border="rgba(255,255,255,0)" borderWidth=2 maintainAspect=false\n| render css=".canvasRenderEl {\n\n}" \n  containerStyle={containerStyle borderRadius="6px" border="2px solid #D3DAE6" backgroundColor="rgba(255,255,255,0)"}',
          },
          {
            id: 'element-9c467f5e-3594-41db-8602-ec45e4f3fe8f',
            position: {
              left: 566.25,
              top: 1650,
              width: 500,
              height: 386,
              angle: 0,
              parent: null,
            },
            expression:
              'shape "square" fill="rgba(255,255,255,0)" border="rgba(255,255,255,0)" borderWidth=2 maintainAspect=false\n| render css=".canvasRenderEl {\n\n}" \n  containerStyle={containerStyle borderRadius="6px" border="2px solid #D3DAE6" backgroundColor="rgba(255,255,255,0)"}',
          },
          {
            id: 'element-a07f8a00-d3da-470c-aea1-b88407900ba5',
            position: {
              left: 30.75,
              top: 1650,
              width: 508.25,
              height: 386,
              angle: 0,
              parent: null,
            },
            expression:
              'shape "square" fill="rgba(255,255,255,0)" border="rgba(255,255,255,0)" borderWidth=2 maintainAspect=false\n| render css=".canvasRenderEl {\n\n}" \n  containerStyle={containerStyle borderRadius="6px" border="2px solid #D3DAE6" backgroundColor="rgba(255,255,255,0)"}',
          },
          {
            id: 'element-80c70a23-12d9-4282-a68e-5d98ceb5a31f',
            position: {
              left: 31.75,
              top: 2084.5,
              width: 1034.5,
              height: 413,
              angle: 0,
              parent: null,
            },
            expression:
              'shape "square" fill="rgba(255,255,255,0)" border="rgba(255,255,255,0)" borderWidth=2 maintainAspect=false\n| render css=".canvasRenderEl {\n\n}" \n  containerStyle={containerStyle borderRadius="6px" border="2px solid #D3DAE6" backgroundColor="rgba(255,255,255,0)"}',
          },
          {
            id: 'element-105a0788-e347-4fa0-afff-0a6b80633b80',
            position: {
              left: 31.75,
              top: 707,
              width: 1034.5,
              height: 437,
              angle: 0,
              parent: null,
            },
            expression:
              'shape "square" fill="rgba(255,255,255,0)" border="rgba(255,255,255,0)" borderWidth=2 maintainAspect=false\n| render css=".canvasRenderEl {\n\n}" \n  containerStyle={containerStyle borderRadius="6px" border="2px solid #D3DAE6" backgroundColor="rgba(255,255,255,0)"}',
          },
          {
            id: 'element-f1d3d480-8aba-48cb-b5f0-2f6a62e64f3a',
            position: {
              left: 566.25,
              top: 158,
              width: 500,
              height: 508.5,
              angle: 0,
              parent: null,
            },
            expression:
              'shape "square" fill="rgba(255,255,255,0)" border="rgba(255,255,255,0)" borderWidth=2 maintainAspect=false\n| render css=".canvasRenderEl {\n\n}" \n  containerStyle={containerStyle borderRadius="6px" border="2px solid #D3DAE6" backgroundColor="rgba(255,255,255,0)"}',
          },
          {
            id: 'element-58634438-d8c7-4368-8e41-640d858374c3',
            position: {
              left: 31.75,
              top: 158,
              width: 507.25,
              height: 508.5,
              angle: 0,
              parent: null,
            },
            expression:
              'shape "square" fill="rgba(255,255,255,0)" border="rgba(255,255,255,0)" borderWidth=2 maintainAspect=false\n| render css=".canvasRenderEl {\n\n}" \n  containerStyle={containerStyle borderRadius="6px" border="2px solid #D3DAE6" backgroundColor="rgba(255,255,255,0)"}',
          },
          {
            id: 'element-9f76c74a-28d9-4ceb-bd7d-b1b34999a11e',
            position: {
              left: 52,
              top: 178,
              width: 500,
              height: 38,
              angle: 0,
              parent: null,
            },
            expression:
              'filters\n| demodata\n| markdown "### Total cost by project type" \n  font={font family="\'Open Sans\', Helvetica, Arial, sans-serif" size=14 align="left" color="#000000" weight="normal" underline=false italic=false}\n| render css=""',
          },
          {
            id: 'element-3b6345a5-16ea-4828-beec-425458e758a7',
            position: {
              left: 591.25,
              top: 240,
              width: 455,
              height: 403,
              angle: 0,
              parent: null,
            },
            expression:
              'filters\n| demodata\n| pointseries x="size(project)" y="project" color="project"\n| plot defaultStyle={seriesStyle bars=0.75 horizontalBars=true} legend=false seriesStyle={seriesStyle label="elasticsearch" color="#882e72"}\n  seriesStyle={seriesStyle label="machine-learning" color="#d6c1de"}\n  seriesStyle={seriesStyle label="apm" color="#5289c7"}\n  seriesStyle={seriesStyle label="kibana" color="#7bafde"}\n  seriesStyle={seriesStyle label="beats" color="#b178a6"}\n  seriesStyle={seriesStyle label="logstash" color="#1965b0"}\n  seriesStyle={seriesStyle label="x-pack" color="#4eb265"}\n  seriesStyle={seriesStyle label="swiftype" color="#90c987"}\n| render \n  css=".flot-y-axis {\n left: 14px !important;\n}\n\n.flot-x-axis>div {\n top: 380px !important;\n}"',
          },
          {
            id: 'element-bdfb3910-5f65-4c24-9bbe-e62feb9e5e11',
            position: {
              left: 585.75,
              top: 178,
              width: 378,
              height: 38,
              angle: 0,
              parent: null,
            },
            expression:
              'filters\n| demodata\n| markdown "### Number of projects by project type" \n  font={font family="\'Open Sans\', Helvetica, Arial, sans-serif" size=14 align="left" color="#000000" weight="normal" underline=false italic=false}\n| render css=""',
          },
          {
            id: 'element-161aafca-ba71-43e1-b2a2-dab96a78d717',
            position: {
              left: 53,
              top: 211,
              width: 500,
              height: 38,
              angle: 0,
              parent: null,
            },
            expression:
              'filters\n| demodata\n| markdown "##### Global cost distribution" \n  font={font family="\'Open Sans\', Helvetica, Arial, sans-serif" size=14 align="left" color="#000000" weight="normal" underline=false italic=false}\n| render css=""',
          },
          {
            id: 'element-d0c43968-cdcd-4a25-980f-83d6f0adf68e',
            position: {
              left: 586,
              top: 211,
              width: 500,
              height: 38,
              angle: 0,
              parent: null,
            },
            expression:
              'filters\n| demodata\n| markdown "##### Project type distribution\n" \n  font={font family="\'Open Sans\', Helvetica, Arial, sans-serif" size=14 align="left" color="#000000" weight="normal" underline=false italic=false}\n| render css=""',
          },
          {
            id: 'element-ea1f3942-066f-4032-a9d0-125072d353d9',
            position: {
              left: 61.75,
              top: 793,
              width: 643,
              height: 300,
              angle: 0,
              parent: null,
            },
            expression:
              'filters\n| demodata\n| pointseries x="project" y="mean(percent_uptime)" color="project"\n| plot defaultStyle={seriesStyle bars=0.75} legend=false seriesStyle={seriesStyle label="elasticsearch" color="#882e72"}\n  seriesStyle={seriesStyle label="machine-learning" color="#d6c1de"}\n  seriesStyle={seriesStyle label="apm" color="#5289c7"}\n  seriesStyle={seriesStyle label="logstash" color="#1965b0"}\n  seriesStyle={seriesStyle label="x-pack" color="#4eb265"}\n  seriesStyle={seriesStyle label="kibana" color="#7bafde"}\n  seriesStyle={seriesStyle label="swiftype" color="#90c987"}\n  seriesStyle={seriesStyle label="beats" color="#b178a6"}\n| render css=".flot-x-axis>div {\n top: 258px !important;\n}"',
          },
          {
            id: 'element-5a891ee6-5cb8-4b8a-9c01-302ed42e6a8f',
            position: {
              left: 53,
              top: 726,
              width: 500,
              height: 38,
              angle: 0,
              parent: null,
            },
            expression:
              'filters\n| demodata\n| markdown "### Average uptime" \n  font={font family="\'Open Sans\', Helvetica, Arial, sans-serif" size=14 align="left" color="#000000" weight="normal" underline=false italic=false}\n| render css=""',
          },
          {
            id: 'element-09713339-044e-4084-b4e4-553dbc939d8a',
            position: {
              left: 729,
              top: 757,
              width: 301,
              height: 38,
              angle: 0,
              parent: null,
            },
            expression:
              'filters\n| demodata\n| markdown "##### Global average uptime\n" \n  font={font family="\'Open Sans\', Helvetica, Arial, sans-serif" size=14 align="left" color="#000000" weight="normal" underline=false italic=false}\n| render css=""',
          },
          {
            id: 'element-bd806eff-400b-4816-b728-b28a0390352d',
            position: {
              left: 764,
              top: 833.5,
              width: 200,
              height: 200,
              angle: 0,
              parent: null,
            },
            expression:
              'filters\n| demodata\n| math "mean(percent_uptime)"\n| progress shape="wheel" label={formatnumber "0%"} \n  font={font size=24 family="\'Open Sans\', Helvetica, Arial, sans-serif" color="#000000" align="center"} valueColor="#4eb265"\n| render containerStyle={containerStyle}',
          },
          {
            id: 'element-ccd76ddc-2c03-458d-a0eb-09fcd1e2455f',
            position: {
              left: 53,
              top: 1212,
              width: 500,
              height: 38,
              angle: 0,
              parent: null,
            },
            expression:
              'filters\n| demodata\n| markdown "### Average price by project type" \n  font={font family="\'Open Sans\', Helvetica, Arial, sans-serif" size=14 align="left" color="#000000" weight="normal" underline=false italic=false}\n| render css=""',
          },
          {
            id: 'element-ef88de44-1629-4a66-abc5-3764b03342e5',
            position: {
              left: 55.5,
              top: 2110,
              width: 500,
              height: 38,
              angle: 0,
              parent: null,
            },
            expression:
              'filters\n| demodata\n| markdown "### Raw data" \n  font={font family="\'Open Sans\', Helvetica, Arial, sans-serif" size=14 align="left" color="#000000" weight="normal" underline=false italic=false}\n| render css=""',
          },
          {
            id: 'element-1dbb5050-7b7c-4dd2-ab83-95913d15cc91',
            position: {
              left: 62.75,
              top: 273.75,
              width: 434.625,
              height: 285,
              angle: 0,
              parent: null,
            },
            expression:
              'filters\n| demodata\n| pointseries color="project" size="sum(cost)"\n| pie hole=50 labels=false legend="ne"\n| render \n  css="table {\n  right: -16px !important;\n}\n\n\ntr {\n height: 36px;\n}\n\n.legendColorBox div {\n margin-right: 7px;\n}\n\n.legendColorBox div div {\n width: 24px !important;\n height: 24px !important;\nborder-width: 4px !important;\n}\n\ntd {\n vertical-align: middle;\n}" containerStyle={containerStyle overflow="visible"}',
          },
          {
            id: 'element-8ca58ae7-2091-491f-996f-4256dfd5f4e1',
            position: {
              left: 51.875,
              top: 2162,
              width: 994.25,
              height: 300,
              angle: 0,
              parent: null,
            },
            expression:
              'filters\n| demodata\n| table\n| render containerStyle={containerStyle overflow="hidden"}',
          },
          {
            id: 'element-64db6690-dd39-4591-973d-d880e068de74',
            position: {
              left: 88,
              top: 1259.5,
              width: 902,
              height: 300,
              angle: 0,
              parent: null,
            },
            expression:
              'filters\n| demodata\n| pointseries x="time" y="mean(price)" color="project"\n| plot defaultStyle={seriesStyle lines=3} \n  palette={palette "#882E72" "#B178A6" "#D6C1DE" "#1965B0" "#5289C7" "#7BAFDE" "#4EB265" "#90C987" "#CAE0AB" "#F7EE55" "#F6C141" "#F1932D" "#E8601C" "#DC050C" gradient=false} legend="ne" seriesStyle={seriesStyle label="elasticsearch" color="#882e72"}\n  seriesStyle={seriesStyle color="#b178a6" label="beats"}\n  seriesStyle={seriesStyle label="machine-learning" color="#d6c1de"}\n  seriesStyle={seriesStyle label="logstash" color="#1965b0"}\n  seriesStyle={seriesStyle label="apm" color="#5289c7"}\n  seriesStyle={seriesStyle label="kibana" color="#7bafde"}\n  seriesStyle={seriesStyle label="x-pack" color="#4eb265"}\n  seriesStyle={seriesStyle label="swiftype" color="#90c987"}\n| render containerStyle={containerStyle overflow="visible"} \n  css=".legend table {\n top: 266px !important;\n width: 100%;\n left: 80px;\n}\n\n.legend td {\nvertical-align: middle;\n}\n\ntr {\n padding-left: 14px;\n}\n\n.legendLabel {\n padding-left: 4px;\n}\n\ntbody {\n display: flex;\n}\n\n.flot-x-axis {\n top: 16px !important;\n}"',
          },
          {
            id: 'element-28fdc851-17bf-4a78-84f1-944fbf508d50',
            position: {
              left: 861.25,
              top: 44.75,
              width: 205,
              height: 36,
              angle: 0,
              parent: null,
            },
            expression:
              'timefilterControl compact=true column="@timestamp"\n| render css=".canvasTimePickerPopover__button {\n border: none !important;\n}"',
            filter: 'timefilter from="now-14d" to=now column=@timestamp',
          },
          {
            id: 'element-bf025bbc-7109-45a1-b954-bab851bc80df',
            position: {
              left: 764,
              top: 44.75,
              width: 89,
              height: 25,
              angle: 0,
              parent: null,
            },
            expression:
              'filters\n| demodata\n| markdown "#### Time period" \n  font={font family="\'Open Sans\', Helvetica, Arial, sans-serif" size=14 align="left" color="#FFFFFF" weight="normal" underline=false italic=false}\n| render css="h4 {\n font-weight: 400;\n}"',
          },
          {
            id: 'element-120f58cd-3ef0-40b6-99fd-32cc1480b9aa',
            position: {
              left: 53,
              top: 757,
              width: 500,
              height: 38,
              angle: 0,
              parent: null,
            },
            expression:
              'filters\n| demodata\n| markdown "##### Average uptime by project type" \n  font={font family="\'Open Sans\', Helvetica, Arial, sans-serif" size=14 align="left" color="#000000" weight="normal" underline=false italic=false}\n| render css=""',
          },
          {
            id: 'element-c30023e3-5df6-4b54-8286-544811ce7b6a',
            position: {
              left: 51.875,
              top: 1670,
              width: 500,
              height: 38,
              angle: 0,
              parent: null,
            },
            expression:
              'filters\n| demodata\n| markdown "### Total cost by project type" \n  font={font family="\'Open Sans\', Helvetica, Arial, sans-serif" size=14 align="left" color="#000000" weight="normal" underline=false italic=false}\n| render css=""',
          },
          {
            id: 'element-137409de-6f24-4234-9c5a-024054d0632a',
            position: {
              left: 593.25,
              top: 1665.5,
              width: 446,
              height: 38,
              angle: 0,
              parent: null,
            },
            expression:
              'filters\n| demodata\n| markdown "### Average price over time" \n  font={font family="\'Open Sans\', Helvetica, Arial, sans-serif" size=14 align="left" color="#000000" weight="normal" underline=false italic=false}\n| render css=""',
          },
          {
            id: 'element-b90b71f0-139b-419f-b43b-b2057abf777b',
            position: {
              left: 595.75,
              top: 1698.5,
              width: 223,
              height: 19,
              angle: 0,
              parent: null,
            },
            expression:
              'filters\n| demodata\n| markdown "##### Price trend over time" \n  font={font family="\'Open Sans\', Helvetica, Arial, sans-serif" size=14 align="left" color="#000000" weight="normal" underline=false italic=false}\n| render css=""',
          },
          {
            id: 'element-a9b94f64-5336-4e39-ac69-5c9dacfbe129',
            position: {
              left: 53,
              top: 1703.5,
              width: 500,
              height: 38,
              angle: 0,
              parent: null,
            },
            expression:
              'filters\n| demodata\n| markdown "##### State distribution\n" \n  font={font family="\'Open Sans\', Helvetica, Arial, sans-serif" size=14 align="left" color="#000000" weight="normal" underline=false italic=false}\n| render css=""',
          },
          {
            id: 'element-8777dd63-fbe7-446f-a23a-74cf55dc0a7c',
            position: {
              left: 109.75,
              top: 37.75,
              width: 500,
              height: 39,
              angle: 0,
              parent: null,
            },
            expression:
              'filters\n| demodata\n| markdown "## Monitoring Elastic projects" "" \n  font={font family="\'Open Sans\', Helvetica, Arial, sans-serif" size=14 align="left" color="#FFFFFF" weight="bold" underline=false italic=false}\n| render css=".canvasRenderEl {\n\n}"',
          },
          {
            id: 'element-5e85d913-fb4b-41d5-9caf-ca2de9970cc7',
            position: {
              left: 13.75,
              top: 29.8125,
              width: 92,
              height: 54.875,
              angle: 0,
              parent: null,
            },
            expression: 'image dataurl=null mode="contain"\n| render',
          },
          {
            id: 'element-896f3043-4036-45f4-9e84-8aa6d870f215',
            position: {
              left: 53,
              top: 1729,
              width: 417.375,
              height: 290,
              angle: 0,
              parent: null,
            },
            expression:
              'filters\n| demodata\n| pointseries x="sum(cost)" y="project" color="state"\n| plot defaultStyle={seriesStyle bars=0.75 horizontalBars=true} legend="ne"\n| render containerStyle={containerStyle overflow="visible"} \n  css=".legend table {\n top: 100px !important;\n right: -46px !important;\n}\n\n.legendColorBox>div{\nmargin-right: 3px !important;\n}\n\n.legend td {\n\nvertical-align: middle;\n}\n\n.legend tr {\n height: 20px;\n}\n\n.flot-x-axis {\n top: -15px !important;\n}\n\n.flot-y-axis {\n left: 10px !important;\n}"',
          },
          {
            id: 'element-13888369-9dac-4948-90b1-0ae42fa8fa53',
            position: {
              left: 593.75,
              top: 1733,
              width: 441,
              height: 282,
              angle: 0,
              parent: null,
            },
            expression:
              'filters\n| demodata\n| pointseries x="time" y="mean(price)"\n| plot defaultStyle={seriesStyle bars=0.75} legend=false \n  palette={palette "#882E72" "#B178A6" "#D6C1DE" "#1965B0" "#5289C7" "#7BAFDE" "#4EB265" "#90C987" "#CAE0AB" "#F7EE55" "#F6C141" "#F1932D" "#E8601C" "#DC050C" gradient=false}\n| render \n  css=".flot-x-axis {\n top: -15px !important;\n}\n\n.flot-y-axis {\n left: 10px !important;\n}"',
          },
        ],
        groups: [],
      },
    ],
    colors: [
      '#37988d',
      '#c19628',
      '#b83c6f',
      '#3f9939',
      '#1785b0',
      '#ca5f35',
      '#45bdb0',
      '#f2bc33',
      '#e74b8b',
      '#4fbf48',
      '#1ea6dc',
      '#fd7643',
      '#72cec3',
      '#f5cc5d',
      '#ec77a8',
      '#7acf74',
      '#4cbce4',
      '#fd986f',
      '#a1ded7',
      '#f8dd91',
      '#f2a4c5',
      '#a6dfa2',
      '#86d2ed',
      '#fdba9f',
      '#000000',
      '#444444',
      '#777777',
      '#BBBBBB',
      '#FFFFFF',
      'rgba(255,255,255,0)',
    ],
    '@timestamp': '2019-05-31T16:02:40.420Z',
    '@created': '2019-05-31T16:01:45.751Z',
    assets: {},
    css: 'h3 {\ncolor: #343741;\nfont-weight: 400;\n}\n\nh5 {\ncolor: #69707D;\n}',
  },
};
