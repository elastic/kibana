/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TestProviders } from '@kbn/timelines-plugin/public/mock';
import { renderHook } from '@testing-library/react-hooks';
import type { UseBulkAlertTagsItemsProps } from './use_bulk_alert_tags_items';
import { useBulkAlertTagsItems } from './use_bulk_alert_tags_items';
import { useSetAlertTags } from './use_set_alert_tags';

jest.mock('./use_set_alert_tags');

const defaultProps: UseBulkAlertTagsItemsProps = {
  refetch: () => {},
};

describe('useBulkAlertTagsItems', () => {
  beforeEach(() => {
    (useSetAlertTags as jest.Mock).mockReturnValue(jest.fn());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render alert tagging actions', () => {
    const { result } = renderHook(() => useBulkAlertTagsItems(defaultProps), {
      wrapper: TestProviders,
    });
    expect(result.current.alertTagsItems.length).toEqual(1);
    expect(result.current.alertTagsPanels.length).toEqual(1);

    expect(result.current.alertTagsItems[0]['data-test-subj']).toEqual(
      'alert-tags-context-menu-item'
    );
    expect(result.current.alertTagsPanels[0]['data-test-subj']).toEqual(
      'alert-tags-context-menu-panel'
    );
  });

  it('should still render alert tagging panel when useSetAlertTags is null', () => {
    (useSetAlertTags as jest.Mock).mockReturnValue(null);
    const { result } = renderHook(() => useBulkAlertTagsItems(defaultProps), {
      wrapper: TestProviders,
    });

    expect(result.current.alertTagsPanels[0]['data-test-subj']).toEqual(
      'alert-tags-context-menu-panel'
    );
  });
});
