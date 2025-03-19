/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isRight } from 'fp-ts/lib/Either';
import { stringFromBufferRt } from './string_from_buffer_rt';

const sourceMap = {
  version: 3,
  file: 'static/js/main.chunk.js',
  sources: [
    '/foo/src/index.css',
    '/foo/src/App.js',
    'webpack:///./src/index.css?bb0a',
    '/foo/src/index.js',
    '/foo/src/reportWebVitals.js',
  ],
  sourcesContent: [
    "// Imports\nimport ___CSS_LOADER_API_IMPORT___ from \"../node_modules/css-loader/dist/runtime/api.js\";\nvar ___CSS_LOADER_EXPORT___ = ___CSS_LOADER_API_IMPORT___(true);\n// Module\n___CSS_LOADER_EXPORT___.push([module.id, \"body {\\n  margin: 0;\\n  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',\\n    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',\\n    sans-serif;\\n  -webkit-font-smoothing: antialiased;\\n  -moz-osx-font-smoothing: grayscale;\\n}\\n\\ncode {\\n  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',\\n    monospace;\\n}\\n\", \"\",{\"version\":3,\"sources\":[\"webpack://src/index.css\"],\"names\":[],\"mappings\":\"AAAA;EACE,SAAS;EACT;;cAEY;EACZ,mCAAmC;EACnC,kCAAkC;AACpC;;AAEA;EACE;aACW;AACb\",\"sourcesContent\":[\"body {\\n  margin: 0;\\n  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',\\n    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',\\n    sans-serif;\\n  -webkit-font-smoothing: antialiased;\\n  -moz-osx-font-smoothing: grayscale;\\n}\\n\\ncode {\\n  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',\\n    monospace;\\n}\\n\"],\"sourceRoot\":\"\"}]);\n// Exports\nexport default ___CSS_LOADER_EXPORT___;\n",
    'import React from "react";\nimport {\n  BrowserRouter as Router,\n  Switch,\n  Route,\n  Link\n} from "react-router-dom";\n\n// This site has 3 pages, all of which are rendered\n// dynamically in the browser (not server rendered).\n//\n// Although the page does not ever refresh, notice how\n// React Router keeps the URL up to date as you navigate\n// through the site. This preserves the browser history,\n// making sure things like the back button and bookmarks\n// work properly.\n\nexport default function App() {\n  return (\n    <Router>\n      <div>\n        <ul>\n          <li>\n            <Link to="/">Home</Link>\n          </li>\n          <li>\n            <Link to="/about">About</Link>\n          </li>\n          <li>\n            <Link to="/dashboard">Dashboard</Link>\n          </li>\n          <li>\n            <Link to="/error">Error</Link>\n          </li>\n        </ul>\n\n        <hr />\n\n        {/*\n          A <Switch> looks through all its children <Route>\n          elements and renders the first one whose path\n          matches the current URL. Use a <Switch> any time\n          you have multiple routes, but you want only one\n          of them to render at a time\n        */}\n        <Switch>\n          <Route exact path="/">\n            <Home />\n          </Route>\n          <Route path="/about">\n            <About />\n          </Route>\n          <Route path="/dashboard">\n            <Dashboard />\n          </Route>\n          <Route path="/error">\n            <ErrorPage />\n          </Route>\n        </Switch>\n      </div>\n    </Router>\n  );\n}\n\n// You can think of these components as "pages"\n// in your app.\n\nfunction Home() {\n  return (\n    <div>\n      <h2>HOME</h2>\n    </div>\n  );\n}\n\nfunction About() {\n  return (\n    <div>\n      <h2>about</h2>\n    </div>\n  );\n}\n\nfunction Dashboard() {\n  return (\n    <div>\n      <h2>Dashboard</h2>\n    </div>\n  );\n}\n\nfunction ErrorPage() {\n  throw new Error(\'Boomm\')\n  return (\n    <div>\n      <h2>error</h2>\n    </div>\n  );\n}\n',
    "var api = require(\"!../node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js\");\n            var content = require(\"!!../node_modules/css-loader/dist/cjs.js??ref--5-oneOf-4-1!../node_modules/postcss-loader/src/index.js??postcss!./index.css\");\n\n            content = content.__esModule ? content.default : content;\n\n            if (typeof content === 'string') {\n              content = [[module.id, content, '']];\n            }\n\nvar options = {};\n\noptions.insert = \"head\";\noptions.singleton = false;\n\nvar update = api(content, options);\n\n\nif (module.hot) {\n  if (!content.locals || module.hot.invalidate) {\n    var isEqualLocals = function isEqualLocals(a, b, isNamedExport) {\n  if (!a && b || a && !b) {\n    return false;\n  }\n\n  var p;\n\n  for (p in a) {\n    if (isNamedExport && p === 'default') {\n      // eslint-disable-next-line no-continue\n      continue;\n    }\n\n    if (a[p] !== b[p]) {\n      return false;\n    }\n  }\n\n  for (p in b) {\n    if (isNamedExport && p === 'default') {\n      // eslint-disable-next-line no-continue\n      continue;\n    }\n\n    if (!a[p]) {\n      return false;\n    }\n  }\n\n  return true;\n};\n    var oldLocals = content.locals;\n\n    module.hot.accept(\n      \"!!../node_modules/css-loader/dist/cjs.js??ref--5-oneOf-4-1!../node_modules/postcss-loader/src/index.js??postcss!./index.css\",\n      function () {\n        content = require(\"!!../node_modules/css-loader/dist/cjs.js??ref--5-oneOf-4-1!../node_modules/postcss-loader/src/index.js??postcss!./index.css\");\n\n              content = content.__esModule ? content.default : content;\n\n              if (typeof content === 'string') {\n                content = [[module.id, content, '']];\n              }\n\n              if (!isEqualLocals(oldLocals, content.locals)) {\n                module.hot.invalidate();\n\n                return;\n              }\n\n              oldLocals = content.locals;\n\n              update(content);\n      }\n    )\n  }\n\n  module.hot.dispose(function() {\n    update();\n  });\n}\n\nmodule.exports = content.locals || {};",
    "/*eslint-disable import/first */\nimport { init as initApm } from '@elastic/apm-rum'\ninitApm({\n  serviceName: 'fleet-source-map-client',\n  serverUrl: 'http://localhost:8200',\n  // serverUrl: 'https://776d64ec093b47ff86c752f62baa8f51.apm.us-west1.gcp.cloud.es.io:443',\n  serviceVersion: '1.0.0',\n  environment: 'production'\n})\nimport React from 'react';\nimport ReactDOM from 'react-dom';\nimport './index.css';\nimport App from './App';\nimport reportWebVitals from './reportWebVitals';\n\nReactDOM.render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>,\n  document.getElementById('root')\n);\n\n// If you want to start measuring performance in your app, pass a function\n// to log results (for example: reportWebVitals(console.log))\n// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals\nreportWebVitals();\n",
    "const reportWebVitals = onPerfEntry => {\n  if (onPerfEntry && onPerfEntry instanceof Function) {\n    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {\n      getCLS(onPerfEntry);\n      getFID(onPerfEntry);\n      getFCP(onPerfEntry);\n      getLCP(onPerfEntry);\n      getTTFB(onPerfEntry);\n    });\n  }\n};\n\nexport default reportWebVitals;\n",
  ],
  mappings:
    ';;;;;;;;;;AAAA;AAAA;AAAA;AAAA;AACA;AACA;AACA;AACA;AACA;AACA;;;;;;;;;;;;;;;;;;;;;;;;ACNA;AACA;AAQA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AAAA;AAAA;AAAA;AAAA;AAAA;AAAA;AADA;AAAA;AAAA;AAAA;AAAA;AAGA;AACA;AAAA;AAAA;AAAA;AAAA;AAAA;AAAA;AADA;AAAA;AAAA;AAAA;AAAA;AAGA;AACA;AAAA;AAAA;AAAA;AAAA;AAAA;AAAA;AADA;AAAA;AAAA;AAAA;AAAA;AAGA;AACA;AAAA;AAAA;AAAA;AAAA;AAAA;AAAA;AADA;AAAA;AAAA;AAAA;AAAA;AAVA;AAAA;AAAA;AAAA;AAAA;AAeA;AAAA;AAAA;AAAA;AASA;AACA;AAAA;AAAA;AACA;AAAA;AAAA;AAAA;AADA;AAAA;AAAA;AAAA;AAAA;AAGA;AAAA;AACA;AAAA;AAAA;AAAA;AADA;AAAA;AAAA;AAAA;AAAA;AAGA;AAAA;AACA;AAAA;AAAA;AAAA;AADA;AAAA;AAAA;AAAA;AAAA;AAGA;AAAA;AACA;AAAA;AAAA;AAAA;AADA;AAAA;AAAA;AAAA;AAAA;AAVA;AAAA;AAAA;AAAA;AAAA;AAzBA;AAAA;AAAA;AAAA;AAAA;AADA;AAAA;AAAA;AAAA;AAAA;AA2CA;AAGA;AACA;AAjDA;AACA;AAiDA;AACA;AACA;AACA;AAAA;AAAA;AAAA;AAAA;AAAA;AADA;AAAA;AAAA;AAAA;AAAA;AAIA;AACA;AAPA;AACA;AAOA;AACA;AACA;AACA;AAAA;AAAA;AAAA;AAAA;AAAA;AADA;AAAA;AAAA;AAAA;AAAA;AAIA;AACA;AAPA;AACA;AAOA;AACA;AACA;AACA;AAAA;AAAA;AAAA;AAAA;AAAA;AADA;AAAA;AAAA;AAAA;AAAA;AAIA;AACA;AAPA;AACA;AAOA;AACA;AACA;AACA;AACA;AAAA;AAAA;AAAA;AAAA;AAAA;AADA;AAAA;AAAA;AAAA;AAAA;AAIA;AACA;AARA;AACA;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;AC5FA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;;;;;;;;;;;;;;;;;;;;;;;;;;;;;ACjFA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AALA;AAOA;AACA;AACA;AACA;AACA;;AAEA;AACA;AACA;AAAA;AAAA;AAAA;AADA;AAAA;AAAA;AAAA;AAAA;AAOA;AACA;AACA;AAAA;AACA;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;AC1BA;AACA;AACA;AAAA;AAAA;AAAA;AAAA;AAAA;AAAA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;A',
  sourceRoot: '',
};

describe('stringFromBufferRt', () => {
  describe('decode', () => {
    it('converts from buffer to string', () => {
      const sourceMapBuffer = Buffer.from(JSON.stringify(sourceMap));
      const decoded = stringFromBufferRt.decode(sourceMapBuffer);
      if (isRight(decoded)) {
        expect(decoded.right).toEqual(JSON.stringify(sourceMap));
      } else {
        expect(true).toBeFalsy();
      }
    });
  });
  describe('encode', () => {
    it('converts from string to buffer', () => {
      const encoded = stringFromBufferRt.encode(JSON.stringify(sourceMap));
      expect(encoded).toEqual(Buffer.from(JSON.stringify(sourceMap)));
    });
  });
});
