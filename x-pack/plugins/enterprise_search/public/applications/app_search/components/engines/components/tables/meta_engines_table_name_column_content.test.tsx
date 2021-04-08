/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mountWithIntl } from '../../../../../__mocks__';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiHealth } from '@elastic/eui';

import { SchemaConflictFieldTypes, SchemaConflicts } from '../../../../../shared/types';
import { EngineDetails } from '../../../engine/types';

import { MetaEnginesTableNameColumnContent } from './meta_engines_table_name_column_content';

describe('MetaEnginesTableNameColumnContent', () => {
  it('includes the name of the engine', () => {
    const wrapper = mountWithIntl(
      <MetaEnginesTableNameColumnContent
        showRow={jest.fn()}
        hideRow={jest.fn()}
        name={'test-engine'}
        item={
          {
            name: 'test-engine',
            created_at: 'Fri, 1 Jan 1970 12:00:00 +0000',
            language: 'English',
            isMeta: true,
            document_count: 99999,
            field_count: 10,
            includedEngines: [] as EngineDetails[],
          } as EngineDetails
        }
        isExpanded={false}
        sendEngineTableLinkClickTelemetry={jest.fn()}
      />
    );

    expect(wrapper.text()).toContain('test-engine');
  });

  describe('toggle button', () => {
    it('displays expanded row when the row is currently hidden', () => {
      const showRow = jest.fn();

      const wrapper = shallow(
        <MetaEnginesTableNameColumnContent
          showRow={showRow}
          hideRow={jest.fn()}
          name={'test-engine'}
          item={
            {
              name: 'test-engine',
              created_at: 'Fri, 1 Jan 1970 12:00:00 +0000',
              language: 'English',
              isMeta: true,
              document_count: 99999,
              field_count: 10,
              includedEngines: [] as EngineDetails[],
            } as EngineDetails
          }
          isExpanded={false}
          sendEngineTableLinkClickTelemetry={jest.fn()}
        />
      );
      wrapper.find('.meta-engines__expand-row').at(0).simulate('click');

      expect(showRow).toHaveBeenCalled();
    });

    it('hides expanded row when the row is currently visible', () => {
      const hideRow = jest.fn();

      const wrapper = shallow(
        <MetaEnginesTableNameColumnContent
          showRow={jest.fn()}
          hideRow={hideRow}
          name={'test-engine'}
          item={
            {
              name: 'test-engine',
              created_at: 'Fri, 1 Jan 1970 12:00:00 +0000',
              language: 'English',
              isMeta: true,
              document_count: 99999,
              field_count: 10,
              includedEngines: [] as EngineDetails[],
            } as EngineDetails
          }
          isExpanded
          sendEngineTableLinkClickTelemetry={jest.fn()}
        />
      );
      wrapper.find('.meta-engines__expand-row').at(0).simulate('click');

      expect(hideRow).toHaveBeenCalled();
    });
  });

  describe('engine count', () => {
    it('is included and labelled', () => {
      const wrapper = mountWithIntl(
        <MetaEnginesTableNameColumnContent
          showRow={jest.fn()}
          hideRow={jest.fn()}
          name={'test-engine'}
          item={
            {
              name: 'test-engine',
              created_at: 'Fri, 1 Jan 1970 12:00:00 +0000',
              language: 'English',
              isMeta: true,
              document_count: 99999,
              field_count: 10,
              engine_count: 2,
              includedEngines: [
                { name: 'source-engine-1' },
                { name: 'source-engine-2' },
              ] as EngineDetails[],
            } as EngineDetails
          }
          isExpanded
          sendEngineTableLinkClickTelemetry={jest.fn()}
        />
      );

      const wrapperContent = wrapper.text();
      expect(wrapperContent).toContain('2 Engines');
    });
    it('defaults to 0', () => {
      const wrapper = mountWithIntl(
        <MetaEnginesTableNameColumnContent
          showRow={jest.fn()}
          hideRow={jest.fn()}
          name={'test-engine'}
          item={
            {
              name: 'test-engine',
              created_at: 'Fri, 1 Jan 1970 12:00:00 +0000',
              language: 'English',
              isMeta: true,
              document_count: 99999,
              field_count: 10,
              includedEngines: [] as EngineDetails[],
            } as EngineDetails
          }
          isExpanded
          sendEngineTableLinkClickTelemetry={jest.fn()}
        />
      );

      const wrapperContent = wrapper.text();
      expect(wrapperContent).toContain('0 Engines');
    });

    it('label loses pluralization with only 1 source engine', () => {
      const wrapper = mountWithIntl(
        <MetaEnginesTableNameColumnContent
          showRow={jest.fn()}
          hideRow={jest.fn()}
          name={'test-engine'}
          item={
            {
              name: 'test-engine',
              created_at: 'Fri, 1 Jan 1970 12:00:00 +0000',
              language: 'English',
              isMeta: true,
              document_count: 99999,
              field_count: 10,
              engine_count: 1,
              includedEngines: [{ name: 'source-engine-1' }] as EngineDetails[],
            } as EngineDetails
          }
          isExpanded
          sendEngineTableLinkClickTelemetry={jest.fn()}
        />
      );

      const wrapperContent = wrapper.text();
      expect(wrapperContent).toContain('1 Engine');
    });
  });

  it('indicates the precense of field-type conflicts', () => {
    const wrapper = shallow(
      <MetaEnginesTableNameColumnContent
        showRow={jest.fn()}
        hideRow={jest.fn()}
        name={'test-engine'}
        item={
          {
            name: 'test-engine',
            created_at: 'Fri, 1 Jan 1970 12:00:00 +0000',
            language: 'English',
            isMeta: true,
            document_count: 99999,
            field_count: 10,
            includedEngines: [
              { name: 'source-engine-1' },
              { name: 'source-engine-2' },
            ] as EngineDetails[],
            schemaConflicts: {
              name: { text: ['source-engine-1', 'source-engine-2'] } as SchemaConflictFieldTypes,
            } as SchemaConflicts,
          } as EngineDetails
        }
        isExpanded
        sendEngineTableLinkClickTelemetry={jest.fn()}
      />
    );

    expect(wrapper.find(EuiHealth)).toHaveLength(1);
  });
});
