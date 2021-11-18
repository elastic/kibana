/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, fireEvent, act, screen } from '@testing-library/react';
import React from 'react';
import { CreateFieldButton } from './index';
import {
  indexPatternFieldEditorPluginMock,
  Start,
} from '../../../../../../../src/plugins/index_pattern_field_editor/public/mocks';

import { TestProviders } from '../../../common/mock';
import { useKibana } from '../../../common/lib/kibana';
import type { DataView } from '../../../../../../../src/plugins/data/common';
import { TimelineId } from '../../../../common';

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

let mockIndexPatternFieldEditor: Start;
jest.mock('../../../common/lib/kibana');

const runAllPromises = () => new Promise(setImmediate);

describe('CreateFieldButton', () => {
  beforeEach(() => {
    mockIndexPatternFieldEditor = indexPatternFieldEditorPluginMock.createStartContract();
    useKibanaMock().services.indexPatternFieldEditor = mockIndexPatternFieldEditor;
    useKibanaMock().services.data.dataViews.get = () => new Promise(() => undefined);
  });

  it('displays the button when user has permissions', () => {
    mockIndexPatternFieldEditor.userPermissions.editIndexPattern = () => true;

    render(
      <CreateFieldButton
        selectedDataViewId={'dataViewId'}
        onClick={() => undefined}
        timelineId={TimelineId.detectionsPage}
      />,
      {
        wrapper: TestProviders,
      }
    );

    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it("doesn't display the button when user doesn't have permissions", () => {
    mockIndexPatternFieldEditor.userPermissions.editIndexPattern = () => false;
    render(
      <CreateFieldButton
        selectedDataViewId={'dataViewId'}
        onClick={() => undefined}
        timelineId={TimelineId.detectionsPage}
      />,
      {
        wrapper: TestProviders,
      }
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it("calls 'onClick' param when the button is clicked", async () => {
    mockIndexPatternFieldEditor.userPermissions.editIndexPattern = () => true;
    useKibanaMock().services.data.dataViews.get = () => Promise.resolve({} as DataView);

    const onClickParam = jest.fn();
    await act(async () => {
      render(
        <CreateFieldButton
          selectedDataViewId={'dataViewId'}
          onClick={onClickParam}
          timelineId={TimelineId.detectionsPage}
        />,
        {
          wrapper: TestProviders,
        }
      );
      await runAllPromises();
    });

    fireEvent.click(screen.getByRole('button'));
    expect(onClickParam).toHaveBeenCalled();
  });
});
