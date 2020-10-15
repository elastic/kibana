/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useState, useMemo } from 'react';

import { EuiButtonEmpty, EuiModalFooter, EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiOverlayMask,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
} from '@elastic/eui';
import { EuiSelectable } from '@elastic/eui';
import { EuiSelectableOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SavedView } from '../../containers/saved_view/saved_view';

interface Props<ViewState> {
  views: Array<SavedView<ViewState>>;
  close(): void;
  setView(viewState: ViewState): void;
  currentView?: ViewState;
}

export function SavedViewListModal<ViewState extends { id: string; name: string }>({
  close,
  views,
  setView,
  currentView,
}: Props<ViewState>) {
  const [options, setOptions] = useState<EuiSelectableOption[] | null>(null);

  const onChange = useCallback((opts: EuiSelectableOption[]) => {
    setOptions(opts);
  }, []);

  const loadView = useCallback(() => {
    if (!options) {
      close();
      return;
    }

    const selected = options.find((o) => o.checked);
    if (!selected) {
      close();
      return;
    }
    setView(views.find((v) => v.id === selected.key)!);
    close();
  }, [options, views, setView, close]);

  const defaultOptions = useMemo<EuiSelectableOption[]>(() => {
    return views.map((v) => ({
      label: v.name,
      key: v.id,
      checked: currentView?.id === v.id ? 'on' : undefined,
    }));
  }, [views, currentView]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <EuiOverlayMask>
      <EuiModal onClose={close}>
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            <FormattedMessage
              defaultMessage="Select a view to load"
              id="xpack.infra.waffle.savedView.selectViewHeader"
            />
          </EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody>
          <EuiSelectable
            singleSelection={true}
            searchable={true}
            options={options || defaultOptions}
            onChange={onChange}
            searchProps={{
              placeholder: i18n.translate('xpack.infra.savedView.searchPlaceholder', {
                defaultMessage: 'Search for saved views',
              }),
            }}
            listProps={{ bordered: true }}
          >
            {(list, search) => (
              <>
                {search}
                <div style={{ marginTop: 20 }}>{list}</div>
              </>
            )}
          </EuiSelectable>
        </EuiModalBody>
        <EuiModalFooter>
          <EuiButtonEmpty data-test-subj="cancelSavedViewModal" onClick={close}>
            <FormattedMessage defaultMessage="Cancel" id="xpack.infra.openView.cancelButton" />
          </EuiButtonEmpty>
          <EuiButton
            fill={true}
            color={'primary'}
            data-test-subj="loadSavedViewModal"
            onClick={loadView}
          >
            <FormattedMessage defaultMessage="Load view" id="xpack.infra.openView.loadButton" />
          </EuiButton>
        </EuiModalFooter>
      </EuiModal>
    </EuiOverlayMask>
  );
}
