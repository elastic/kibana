/* eslint-disable @kbn/license-header/require-license-header */
export const search = {
  _index: '.kibana',
  _type: 'search',
  _id: 'mock-search',
  _version: 1,
  found: true,
  _source: {
    title: 'to IN',
    description: '',
    hits: 0,
    columns: [
      '_source'
    ],
    sort: [
      '@timestamp',
      'desc'
    ],
    version: 1,
    kibanaSavedObjectMeta: {
      searchSourceJSON: '{\'index\':\'logstash-*\',\'query\':{\'query_string\':{\'query\':\'geo.dest: IN\','
      + '\'analyze_wildcard\':true}},\'filter\':[],\'highlight\':{\'pre_tags\':[\'@kibana-highlighted-field@\'],'
      + '\'post_tags\':[\'@/kibana-highlighted-field@\'],\'fields\':{\'*\':{}},\'require_field_match\':false,'
      + '\'fragment_size\':2147483647}}'
    }
  }
};

export const visualization = {
  _index: '.kibana',
  _type: 'visualization',
  _id: 'mock-visualization',
  _version: 1,
  found: true,
  _source: {
    title: 'dem line',
    visState: '{\'title\':\'New Visualization\',\'type\':\'line\',\'params\':{\'shareYAxis\':true,\'addTooltip\':true,'
    + '\'addLegend\':true,\'showCircles\':true,\'smoothLines\':false,\'interpolate\':\'linear\',\'scale\':\'linear\','
    + '\'drawLinesBetweenPoints\':true,\'radiusRatio\':9,\'times\':[],\'addTimeMarker\':false,\'defaultYExtents\':false,'
    + '\'setYExtents\':false,\'yAxis\':{}},\'aggs\':[{\'id\':\'1\',\'type\':\'count\',\'schema\':\'metric\',\'params\':{}},'
    + '{\'id\':\'2\',\'type\':\'date_histogram\',\'schema\':\'segment\',\'params\':{\'field\':\'@timestamp\',\'interval\':\'auto\','
    + '\'customInterval\':\'2h\',\'min_doc_count\':1,\'extended_bounds\':{}}}],\'listeners\':{}}',
    uiStateJSON: '{}',
    description: '',
    version: 1,
    kibanaSavedObjectMeta: {
      searchSourceJSON: '{\'index\':\'logstash-*\',\'query\':{\'query_string\':{\'query\':\'*\',\'analyze_wildcard\':true}},\'filter\':[]}'
    }
  }
};

export const dashboard = {
  _index: '.kibana',
  _type: 'dashboard',
  _id: 'mock-dashboard',
  _version: 1,
  found: true,
  _source: {
    title: 'example dashboard',
    hits: 0,
    description: '',
    panelsJSON: '[{\'id\':\'mock-visualization\',\'type\':\'visualization\',\'panelIndex\':1,\'size_x\':3,\'size_y\':5,'
    + '\'col\':1,\'row\':1},{\'id\':\'mock-search\',\'type\':\'search\',\'panelIndex\':2,\'size_x\':7,\'size_y\':4,\'col\':4,'
    + '\'row\':1,\'columns\':[\'_source\'],\'sort\':[\'@timestamp\',\'desc\']}]',
    optionsJSON: '{\'darkTheme\':false}',
    uiStateJSON: '{}',
    version: 1,
    timeRestore: false,
    kibanaSavedObjectMeta: {
      searchSourceJSON: '{\'filter\':[{\'query\':{\'query_string\':{\'query\':\'*\',\'analyze_wildcard\':true}}}]}'
    }
  }
};
