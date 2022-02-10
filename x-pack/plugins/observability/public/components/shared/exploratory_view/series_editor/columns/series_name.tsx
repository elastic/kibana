/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, ChangeEvent, useEffect, useRef, KeyboardEventHandler } from 'react';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';
import {
  EuiFieldText,
  EuiText,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiOutsideClickDetector,
} from '@elastic/eui';
import { useSeriesStorage } from '../../hooks/use_series_storage';
import { SeriesUrl } from '../../types';

interface Props {
  seriesId: number;
  series: SeriesUrl;
}

export const StyledText = styled(EuiText)`
  &.euiText.euiText--constrainedWidth {
    max-width: 200px;
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
  }
`;

export function SeriesName({ series, seriesId }: Props) {
  const { setSeries } = useSeriesStorage();

  const [value, setValue] = useState(series.name);
  const [isEditingEnabled, setIsEditingEnabled] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  };

  const onSave = () => {
    if (value !== series.name) {
      setSeries(seriesId, { ...series, name: value });
    }
  };

  const onOutsideClick = (event: Event) => {
    if (event.target !== buttonRef.current) {
      setIsEditingEnabled(false);
    }
  };

  const onKeyDown: KeyboardEventHandler<HTMLInputElement> = (event) => {
    if (event.key === 'Enter') {
      setIsEditingEnabled(false);
    }
  };

  useEffect(() => {
    setValue(series.name);
  }, [series.name]);

  useEffect(() => {
    if (isEditingEnabled && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditingEnabled, inputRef]);

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      {isEditingEnabled ? (
        <EuiFlexItem grow={false}>
          <EuiOutsideClickDetector onOutsideClick={onOutsideClick}>
            <EuiFieldText
              value={value}
              onChange={onChange}
              onBlur={onSave}
              onKeyDown={onKeyDown}
              fullWidth
              inputRef={inputRef}
              aria-label={i18n.translate('xpack.observability.expView.seriesEditor.seriesName', {
                defaultMessage: 'Series name',
              })}
              data-test-subj="exploratoryViewSeriesNameInput"
            />
          </EuiOutsideClickDetector>
        </EuiFlexItem>
      ) : (
        <EuiFlexItem grow={false}>
          <StyledText grow={false}>{value}</StyledText>
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          onClick={() => setIsEditingEnabled(!isEditingEnabled)}
          iconType="pencil"
          aria-label={i18n.translate('xpack.observability.expView.seriesEditor.editName', {
            defaultMessage: 'Edit name',
          })}
          color="text"
          buttonRef={buttonRef}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
