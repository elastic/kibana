import { map } from 'lodash';

export function getESIndices(kbnIndex, elasticsearchClient) {
  const config = {
    index: kbnIndex,
    _source: 'index-pattern.title',
    q: 'type:"index-pattern"',
    size: 100,
  };

  return elasticsearchClient('search', config).then(resp => {
    return map(resp.hits.hits, '_source["index-pattern"].title');
  });
}
