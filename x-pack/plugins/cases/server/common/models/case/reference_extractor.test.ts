/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject, SavedObjectReference } from 'kibana/server';
import { lensEmbeddableFactory } from '../../../../../lens/server/embeddable/lens_embeddable_factory';
import { CommentRequestUserType } from '../../../../common/api';
import { extractLensReferencesFromCommentString, getOrUpdateLensReferences } from './utils';

describe('case utils', () => {
  describe('extractLensReferencesFromCommentString', () => {
    it('extracts the references successfully', () => {
      const commentString = [
        '**Test**   ',
        'Amazingg!!!',
        '[asdasdasdasd](http://localhost:5601/moq/app/security/timelines?timeline=(id%3A%27e4362a60-f478-11eb-a4b0-ebefce184d8d%27%2CisOpen%3A!t))',
        '!{lens{"timeRange":{"from":"now-7d","to":"now","mode":"relative"},"attributes":{"title":"aaaa","type":"lens","visualizationType":"lnsXY","state":{"datasourceStates":{"indexpattern":{"layers":{"layer1":{"columnOrder":["col1","col2"],"columns":{"col2":{"dataType":"number","isBucketed":false,"label":"Count of records","operationType":"count","scale":"ratio","sourceField":"Records"},"col1":{"dataType":"date","isBucketed":true,"label":"@timestamp","operationType":"date_histogram","params":{"interval":"auto"},"scale":"interval","sourceField":"timestamp"}}}}}},"visualization":{"axisTitlesVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"fittingFunction":"None","gridlinesVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"layers":[{"accessors":["col2"],"layerId":"layer1","seriesType":"bar_stacked","xAccessor":"col1","yConfig":[{"forAccessor":"col2"}]}],"legend":{"isVisible":true,"position":"right"},"preferredSeriesType":"bar_stacked","tickLabelsVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"valueLabels":"hide","yRightExtent":{"mode":"full"}},"query":{"language":"kuery","query":""},"filters":[]},"references":[{"type":"index-pattern","id":"90943e30-9a47-11e8-b64d-95841ca0b246","name":"indexpattern-datasource-current-indexpattern"},{"type":"index-pattern","id":"90943e30-9a47-11e8-b64d-95841ca0b248","name":"indexpattern-datasource-layer-layer1"}]},"editMode":false}}',
        '!{lens{"timeRange":{"from":"now-7d","to":"now","mode":"relative"},"attributes":{"title":"aaaa","type":"lens","visualizationType":"lnsXY","state":{"datasourceStates":{"indexpattern":{"layers":{"layer1":{"columnOrder":["col1","col2"],"columns":{"col2":{"dataType":"number","isBucketed":false,"label":"Count of records","operationType":"count","scale":"ratio","sourceField":"Records"},"col1":{"dataType":"date","isBucketed":true,"label":"@timestamp","operationType":"date_histogram","params":{"interval":"auto"},"scale":"interval","sourceField":"timestamp"}}}}}},"visualization":{"axisTitlesVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"fittingFunction":"None","gridlinesVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"layers":[{"accessors":["col2"],"layerId":"layer1","seriesType":"bar_stacked","xAccessor":"col1","yConfig":[{"forAccessor":"col2"}]}],"legend":{"isVisible":true,"position":"right"},"preferredSeriesType":"bar_stacked","tickLabelsVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"valueLabels":"hide","yRightExtent":{"mode":"full"}},"query":{"language":"kuery","query":""},"filters":[]},"references":[{"type":"index-pattern","id":"90943e30-9a47-11e8-b64d-95841ca0b246","name":"indexpattern-datasource-current-indexpattern"},{"type":"index-pattern","id":"90943e30-9a47-11e8-b64d-95841ca0b247","name":"indexpattern-datasource-layer-layer1"}]},"editMode":false}}',
      ].join('\n\n');

      const extractedReferences = extractLensReferencesFromCommentString(
        lensEmbeddableFactory,
        commentString
      );

      const expectedReferences = [
        {
          type: 'index-pattern',
          id: '90943e30-9a47-11e8-b64d-95841ca0b246',
          name: 'indexpattern-datasource-current-indexpattern',
        },
        {
          type: 'index-pattern',
          id: '90943e30-9a47-11e8-b64d-95841ca0b248',
          name: 'indexpattern-datasource-layer-layer1',
        },
        {
          type: 'index-pattern',
          id: '90943e30-9a47-11e8-b64d-95841ca0b247',
          name: 'indexpattern-datasource-layer-layer1',
        },
      ];

      expect(expectedReferences.length).toEqual(extractedReferences.length);
      expect(expectedReferences).toEqual(expect.arrayContaining(extractedReferences));
    });

    it('returns an empty array when the comment string is undefined', () => {
      expect(extractLensReferencesFromCommentString(lensEmbeddableFactory)).toEqual([]);
    });
  });

  describe('getOrUpdateLensReferences', () => {
    it('update references', () => {
      const currentCommentStringReferences = [
        [
          {
            type: 'index-pattern',
            id: '90943e30-9a47-11e8-b64d-95841ca0b246',
            name: 'indexpattern-datasource-current-indexpattern',
          },
          {
            type: 'index-pattern',
            id: '90943e30-9a47-11e8-b64d-95841ca0b248',
            name: 'indexpattern-datasource-layer-layer1',
          },
        ],
        [
          {
            type: 'index-pattern',
            id: '90943e30-9a47-11e8-b64d-95841ca0b246',
            name: 'indexpattern-datasource-current-indexpattern',
          },
          {
            type: 'index-pattern',
            id: '90943e30-9a47-11e8-b64d-95841ca0b248',
            name: 'indexpattern-datasource-layer-layer1',
          },
        ],
      ];

      const currentCommentString = createCommentStringWithTwoLensViz(
        currentCommentStringReferences[0],
        currentCommentStringReferences[1]
      );

      const nonLensCurrentCommentReferences = [
        { type: 'case', id: '7b4be181-9646-41b8-b12d-faabf1bd9512', name: 'Test case' },
        {
          type: 'timeline',
          id: '0f847d31-9683-4ebd-92b9-454e3e39aec1',
          name: 'Test case timeline',
        },
      ];

      const currentCommentReferences = [
        ...currentCommentStringReferences.flat(),
        ...nonLensCurrentCommentReferences,
      ];

      const newCommentStringReferences = [
        {
          type: 'index-pattern',
          id: '90943e30-9a47-11e8-b64d-95841ca0b245',
          name: 'indexpattern-datasource-current-indexpattern',
        },
        {
          type: 'index-pattern',
          id: '90943e30-9a47-11e8-b64d-95841ca0b248',
          name: 'indexpattern-datasource-layer-layer1',
        },
      ];

      const newCommentString = createCommentStringWithOneLensViz(newCommentStringReferences);

      const updatedReferences = getOrUpdateLensReferences(lensEmbeddableFactory, newCommentString, {
        references: currentCommentReferences,
        attributes: {
          comment: currentCommentString,
        },
      } as SavedObject<CommentRequestUserType>);

      const expectedReferences = [
        ...nonLensCurrentCommentReferences,
        ...newCommentStringReferences,
      ];

      expect(expectedReferences.length).toEqual(updatedReferences.length);
      expect(expectedReferences).toEqual(expect.arrayContaining(updatedReferences));
    });

    it('gets the references when there is no current comment', () => {
      const newCommentStringReferences = [
        {
          type: 'index-pattern',
          id: '90943e30-9a47-11e8-b64d-95841ca0b245',
          name: 'indexpattern-datasource-current-indexpattern',
        },
        {
          type: 'index-pattern',
          id: '90943e30-9a47-11e8-b64d-95841ca0b248',
          name: 'indexpattern-datasource-layer-layer1',
        },
      ];

      const newCommentString = createCommentStringWithOneLensViz(newCommentStringReferences);

      const updatedReferences = getOrUpdateLensReferences(lensEmbeddableFactory, newCommentString);

      expect(updatedReferences).toEqual(newCommentStringReferences);
    });
  });
});

const createCommentStringWithTwoLensViz = (
  referencesForViz1: SavedObjectReference[],
  referencesForViz2: SavedObjectReference[]
) => {
  return [
    '**Test**   ',
    '[asdasdasdasd](http://localhost:5601/moq/app/security/timelines?timeline=(id%3A%27e4362a60-f478-11eb-a4b0-ebefce184d8d%27%2CisOpen%3A!t))',
    `!{lens{"timeRange":{"from":"now-7d","to":"now","mode":"relative"},"attributes":{"title":"aaaa","type":"lens","visualizationType":"lnsXY","state":{"datasourceStates":{"indexpattern":{"layers":{"layer1":{"columnOrder":["col1","col2"],"columns":{"col2":{"dataType":"number","isBucketed":false,"label":"Count of records","operationType":"count","scale":"ratio","sourceField":"Records"},"col1":{"dataType":"date","isBucketed":true,"label":"@timestamp","operationType":"date_histogram","params":{"interval":"auto"},"scale":"interval","sourceField":"timestamp"}}}}}},"visualization":{"axisTitlesVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"fittingFunction":"None","gridlinesVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"layers":[{"accessors":["col2"],"layerId":"layer1","seriesType":"bar_stacked","xAccessor":"col1","yConfig":[{"forAccessor":"col2"}]}],"legend":{"isVisible":true,"position":"right"},"preferredSeriesType":"bar_stacked","tickLabelsVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"valueLabels":"hide","yRightExtent":{"mode":"full"}},"query":{"language":"kuery","query":""},"filters":[]},"references":${JSON.stringify(
      referencesForViz1
    )}},"editMode":false}}`,
    `!{lens{"timeRange":{"from":"now-7d","to":"now","mode":"relative"},"attributes":{"title":"aaaa","type":"lens","visualizationType":"lnsXY","state":{"datasourceStates":{"indexpattern":{"layers":{"layer1":{"columnOrder":["col1","col2"],"columns":{"col2":{"dataType":"number","isBucketed":false,"label":"Count of records","operationType":"count","scale":"ratio","sourceField":"Records"},"col1":{"dataType":"date","isBucketed":true,"label":"@timestamp","operationType":"date_histogram","params":{"interval":"auto"},"scale":"interval","sourceField":"timestamp"}}}}}},"visualization":{"axisTitlesVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"fittingFunction":"None","gridlinesVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"layers":[{"accessors":["col2"],"layerId":"layer1","seriesType":"bar_stacked","xAccessor":"col1","yConfig":[{"forAccessor":"col2"}]}],"legend":{"isVisible":true,"position":"right"},"preferredSeriesType":"bar_stacked","tickLabelsVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"valueLabels":"hide","yRightExtent":{"mode":"full"}},"query":{"language":"kuery","query":""},"filters":[]},"references":${JSON.stringify(
      referencesForViz2
    )}},"editMode":false}}`,
  ].join('\n\n');
};

const createCommentStringWithOneLensViz = (references: SavedObjectReference[]) => {
  return [
    '**Test**   ',
    'Awmazingg!!!',
    '[asdasdasdasd](http://localhost:5601/moq/app/security/timelines?timeline=(id%3A%27e4362a60-f478-11eb-a4b0-ebefce184d8d%27%2CisOpen%3A!t))',
    `!{lens{"timeRange":{"from":"now-7d","to":"now","mode":"relative"},"attributes":{"title":"aaaa","type":"lens","visualizationType":"lnsXY","state":{"datasourceStates":{"indexpattern":{"layers":{"layer1":{"columnOrder":["col1","col2"],"columns":{"col2":{"dataType":"number","isBucketed":false,"label":"Count of records","operationType":"count","scale":"ratio","sourceField":"Records"},"col1":{"dataType":"date","isBucketed":true,"label":"@timestamp","operationType":"date_histogram","params":{"interval":"auto"},"scale":"interval","sourceField":"timestamp"}}}}}},"visualization":{"axisTitlesVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"fittingFunction":"None","gridlinesVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"layers":[{"accessors":["col2"],"layerId":"layer1","seriesType":"bar_stacked","xAccessor":"col1","yConfig":[{"forAccessor":"col2"}]}],"legend":{"isVisible":true,"position":"right"},"preferredSeriesType":"bar_stacked","tickLabelsVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"valueLabels":"hide","yRightExtent":{"mode":"full"}},"query":{"language":"kuery","query":""},"filters":[]},"references":${JSON.stringify(
      references
    )}},"editMode":false}}`,
  ].join('\n\n');
};
