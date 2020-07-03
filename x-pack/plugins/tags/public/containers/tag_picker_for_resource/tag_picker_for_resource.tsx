/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect } from 'react';
import { takeUntil } from 'rxjs/operators';
import { EuiButton, EuiButtonEmpty } from '@elastic/eui';
import { EuiSpacer } from '@elastic/eui';
import { EuiFlexGroup } from '@elastic/eui';
import { EuiFlexItem } from '@elastic/eui';
import { TagPicker } from '../tag_picker';
import { useTags } from '../../context';
import { RawTagAttachmentWithId } from '../../../common';
import { useUnmount$ } from '../../management/hooks/use_unmount';
import { txtSave, txtCancel } from './i18n';

export interface TagPickerForResourceProps {
  kid: string;
  onSave: (selected: string[]) => void;
  onCancel: () => void;
}

export const TagPickerForResource: React.FC<TagPickerForResourceProps> = ({
  kid,
  onSave,
  onCancel,
  ...rest
}) => {
  const unmount$ = useUnmount$();
  const { manager } = useTags();
  const resource = manager!.useResource(kid);
  const [attachments, setAttachments] = useState<RawTagAttachmentWithId[] | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    manager!
      .getResourceDataAttachments$(kid)
      .pipe(takeUntil(unmount$))
      .subscribe((response) => {
        const loadedAttachments = response.map(({ data }) => data);
        setAttachments(loadedAttachments);
        setSelected(loadedAttachments.map(({ tagId }) => tagId));
      }, setError);
  }, [unmount$, manager, kid]);

  if (!attachments && !error) {
    return (
      <TagPicker isDisabled selected={resource.map(({ data }) => data.tagId)} onChange={() => {}} />
    );
  }

  if (error) {
    return <div>could not load resource tag attachments: {error.message}</div>;
  }

  const handleSave = () => {
    onSave(selected);
  };

  return (
    <>
      <TagPicker {...rest} selected={selected} onChange={setSelected} />
      <EuiSpacer size={'s'} />
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiButton fill size={'s'} onClick={handleSave}>
            {txtSave}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty size={'s'} color={'danger'} onClick={onCancel}>
            {txtCancel}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
