/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, memo } from 'react';
import {
  EuiSelectableOption,
  EuiModalBody,
  EuiModalHeader,
  EuiMarkdownEditorUiPlugin,
  EuiCodeBlock,
} from '@elastic/eui';

// import { LensType } from '../../../../../../common/types/lens';
// import { SelectableLens } from '../../../../../lenss/components/lens/selectable_lens';
// import { OpenLensResult } from '../../../../../lenss/components/open_lens/types';
// import { getLensUrl, useFormatUrl } from '../../../link_to';

import { ID } from './constants';
import * as i18n from './translations';
import { SecurityPageName } from '../../../../../app/types';

interface LensEditorProps {
  onClosePopover: () => void;
  onInsert: (markdown: string, config: { block: boolean }) => void;
}

const LensEditorComponent: React.FC<LensEditorProps> = ({ onClosePopover, onInsert }) => {
  // const { formatUrl } = useFormatUrl(SecurityPageName.lenss);

  // const handleGetSelectableOptions = useCallback(
  //   ({ lenss }: { lenss: OpenLensResult[] }) => [
  //     ...lenss.map(
  //       (t: OpenLensResult, index: number) =>
  //         ({
  //           description: t.description,
  //           favorite: t.favorite,
  //           label: t.title,
  //           id: t.savedObjectId,
  //           key: `${t.title}-${index}`,
  //           title: t.title,
  //           checked: undefined,
  //         } as EuiSelectableOption)
  //     ),
  //   ],
  //   []
  // );

  // const handleLensChange = useCallback(
  //   (lensTitle, lensId, graphEventId) => {
  //     const url = formatUrl(getLensUrl(lensId ?? '', graphEventId), {
  //       absolute: true,
  //       skipSearch: true,
  //     });
  //     onInsert(`[${lensTitle}](${url})`, {
  //       block: false,
  //     });
  //   },
  //   [formatUrl, onInsert]
  // );

  return (
    <>
      <EuiModalHeader />
      <EuiModalBody>
        {/* <SelectableLens
          hideUntitled={true}
          getSelectableOptions={handleGetSelectableOptions}
          onLensChange={handleLensChange}
          onClosePopover={onClosePopover}
          lensType={LensType.default}
        /> */}
      </EuiModalBody>
    </>
  );
};

const LensEditor = memo(LensEditorComponent);

export const plugin: EuiMarkdownEditorUiPlugin = {
  name: ID,
  button: {
    label: i18n.INSERT_LENS,
    iconType: 'lensApp',
  },
  helpText: (
    <EuiCodeBlock language="md" paddingSize="s" fontSize="l">
      {'[title](url)'}
    </EuiCodeBlock>
  ),
  editor: function editor({ node, onSave, onCancel }) {
    return <LensEditor onClosePopover={onCancel} onInsert={onSave} />;
  },
};
