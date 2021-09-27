/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject, SavedObjectReference } from 'kibana/server';
import { lensEmbeddableFactory } from '../../../../../lens/server/embeddable/lens_embeddable_factory';
import { CommentRequestUserType } from '../../../../common/api';
import { ReferencesExtractor } from './reference_extractor';

describe('case reference extractor', () => {
  describe('ReferencesExtractor.extractReferences', () => {
    let extractor: ReferencesExtractor;

    beforeEach(() => {
      extractor = new ReferencesExtractor(lensEmbeddableFactory);
    });

    it('returns an empty array when the comment string is an empty string', () => {
      expect(extractor.extractReferences('')).toEqual([]);
    });

    it('returns an empty array when the comment string is an empty string and the previous comment had references', () => {
      const commentSO = {
        references: [{ id: '123', name: 'timeline', type: 'siem-ui-timeline' }],
        attributes: {
          comment:
            '[timeline](http://localhost:5601/app/security/timelines?timeline=(id%3A%27123%27%2CisOpen%3A!t))',
        },
      } as SavedObject<CommentRequestUserType>;
      expect(extractor.extractReferences('', commentSO)).toEqual([]);
    });

    it('extracts references from a timeline and multiple lens visualizations in a new comment', () => {
      const commentString = [
        '**Test**   ',
        'Amazingg!!!',
        '[timeline](http://localhost:5601/app/security/timelines?timeline=(id%3A%27123%27%2CisOpen%3A!t))',
        '!{lens{"timeRange":{"from":"now-7d","to":"now","mode":"relative"},"attributes":{"title":"aaaa","type":"lens","visualizationType":"lnsXY","state":{"datasourceStates":{"indexpattern":{"layers":{"layer1":{"columnOrder":["col1","col2"],"columns":{"col2":{"dataType":"number","isBucketed":false,"label":"Count of records","operationType":"count","scale":"ratio","sourceField":"Records"},"col1":{"dataType":"date","isBucketed":true,"label":"@timestamp","operationType":"date_histogram","params":{"interval":"auto"},"scale":"interval","sourceField":"timestamp"}}}}}},"visualization":{"axisTitlesVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"fittingFunction":"None","gridlinesVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"layers":[{"accessors":["col2"],"layerId":"layer1","seriesType":"bar_stacked","xAccessor":"col1","yConfig":[{"forAccessor":"col2"}]}],"legend":{"isVisible":true,"position":"right"},"preferredSeriesType":"bar_stacked","tickLabelsVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"valueLabels":"hide","yRightExtent":{"mode":"full"}},"query":{"language":"kuery","query":""},"filters":[]},"references":[{"type":"index-pattern","id":"90943e30-9a47-11e8-b64d-95841ca0b246","name":"indexpattern-datasource-current-indexpattern"},{"type":"index-pattern","id":"90943e30-9a47-11e8-b64d-95841ca0b248","name":"indexpattern-datasource-layer-layer1"}]},"editMode":false}}',
        '!{lens{"timeRange":{"from":"now-7d","to":"now","mode":"relative"},"attributes":{"title":"aaaa","type":"lens","visualizationType":"lnsXY","state":{"datasourceStates":{"indexpattern":{"layers":{"layer1":{"columnOrder":["col1","col2"],"columns":{"col2":{"dataType":"number","isBucketed":false,"label":"Count of records","operationType":"count","scale":"ratio","sourceField":"Records"},"col1":{"dataType":"date","isBucketed":true,"label":"@timestamp","operationType":"date_histogram","params":{"interval":"auto"},"scale":"interval","sourceField":"timestamp"}}}}}},"visualization":{"axisTitlesVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"fittingFunction":"None","gridlinesVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"layers":[{"accessors":["col2"],"layerId":"layer1","seriesType":"bar_stacked","xAccessor":"col1","yConfig":[{"forAccessor":"col2"}]}],"legend":{"isVisible":true,"position":"right"},"preferredSeriesType":"bar_stacked","tickLabelsVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"valueLabels":"hide","yRightExtent":{"mode":"full"}},"query":{"language":"kuery","query":""},"filters":[]},"references":[{"type":"index-pattern","id":"90943e30-9a47-11e8-b64d-95841ca0b246","name":"indexpattern-datasource-current-indexpattern"},{"type":"index-pattern","id":"90943e30-9a47-11e8-b64d-95841ca0b247","name":"indexpattern-datasource-layer-layer1"}]},"editMode":false}}',
      ].join('\n\n');

      const extractedReferences = extractor.extractReferences(commentString);

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
        { id: '123', name: 'timeline', type: 'siem-ui-timeline' },
      ];

      expect(extractedReferences.length).toEqual(expectedReferences.length);
      expect(extractedReferences).toEqual(expect.arrayContaining(expectedReferences));
    });

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

      const currentCommentString = createCommentStringWithTwoLensVizAndOneTimeline(
        currentCommentStringReferences[0],
        currentCommentStringReferences[1]
      );

      const nonLensCurrentCommentReferences = [
        { type: 'case', id: '7b4be181-9646-41b8-b12d-faabf1bd9512', name: 'Test case' },
        {
          type: 'siem-ui-timeline',
          id: 'e4362a60-f478-11eb-a4b0-ebefce184d8d',
          name: 'asdasdasdasd',
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

      const newCommentString = createCommentStringWithOneLensVizAndOneTimeline(
        newCommentStringReferences
      );

      const updatedReferences = extractor.extractReferences(newCommentString, {
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

      const newCommentString = createCommentStringWithOneLensVizAndOneTimeline(
        newCommentStringReferences
      );

      const updatedReferences = extractor.extractReferences(newCommentString);

      expect(updatedReferences).toEqual([
        ...newCommentStringReferences,
        {
          type: 'siem-ui-timeline',
          id: 'e4362a60-f478-11eb-a4b0-ebefce184d8d',
          name: 'asdasdasdasd',
        },
      ]);
    });
  });
});

const createCommentStringWithTwoLensVizAndOneTimeline = (
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

const createCommentStringWithOneLensVizAndOneTimeline = (references: SavedObjectReference[]) => {
  return [
    '**Test**   ',
    'Awmazingg!!!',
    '[asdasdasdasd](http://localhost:5601/moq/app/security/timelines?timeline=(id%3A%27e4362a60-f478-11eb-a4b0-ebefce184d8d%27%2CisOpen%3A!t))',
    `!{lens{"timeRange":{"from":"now-7d","to":"now","mode":"relative"},"attributes":{"title":"aaaa","type":"lens","visualizationType":"lnsXY","state":{"datasourceStates":{"indexpattern":{"layers":{"layer1":{"columnOrder":["col1","col2"],"columns":{"col2":{"dataType":"number","isBucketed":false,"label":"Count of records","operationType":"count","scale":"ratio","sourceField":"Records"},"col1":{"dataType":"date","isBucketed":true,"label":"@timestamp","operationType":"date_histogram","params":{"interval":"auto"},"scale":"interval","sourceField":"timestamp"}}}}}},"visualization":{"axisTitlesVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"fittingFunction":"None","gridlinesVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"layers":[{"accessors":["col2"],"layerId":"layer1","seriesType":"bar_stacked","xAccessor":"col1","yConfig":[{"forAccessor":"col2"}]}],"legend":{"isVisible":true,"position":"right"},"preferredSeriesType":"bar_stacked","tickLabelsVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"valueLabels":"hide","yRightExtent":{"mode":"full"}},"query":{"language":"kuery","query":""},"filters":[]},"references":${JSON.stringify(
      references
    )}},"editMode":false}}`,
  ].join('\n\n');
};
