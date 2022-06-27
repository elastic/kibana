import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiText,
  EuiTextColor,
} from '@elastic/eui';
import { ResultActions } from './result_actions';
import { ActionProps } from './types';
import { MetaDataProps } from './types';

interface Props {
  title: string;
  metaData: MetaDataProps;
  actions: ActionProps[];
}

interface TermDef {
  label: string | number
}

const Term: React.FC<TermDef> = ({ label }) => (
  <EuiFlexItem grow={false}>
    <strong>
      <EuiTextColor color="subdued">{label}:</EuiTextColor>
    </strong>
  </EuiFlexItem>
)

const Definition: React.FC<TermDef> = ({ label }) => (
  <EuiFlexItem grow={false}>
    <EuiTextColor color="subdued">{label}</EuiTextColor>
  </EuiFlexItem>
)

export const ResultHeader: React.FC<Props> = ({
  title,
  actions,
  metaData,
}) => {
  const [popoverIsOpen, setPopoverIsOpen] = useState(false);

  const closePopover = () => setPopoverIsOpen(false);


  const metaDataIcon = (
    <EuiButtonIcon
      display="empty"
      size="xs"
      iconType="iInCircle"
      color="primary"
      onClick={() => setPopoverIsOpen(!popoverIsOpen)}
    />
  )

  const popover = (
    <EuiPopover
      button={metaDataIcon}
      isOpen={popoverIsOpen}
      closePopover={closePopover}
    >
      <EuiPopoverTitle>Document metadata</EuiPopoverTitle>
      <EuiFlexGroup gutterSize="s" direction="column" style={{ width: '20rem' }}>
        <EuiFlexItem>
          <EuiFlexGroup justifyContent="spaceBetween">
            <Term label="ID" />
            <Definition label={metaData.id} />
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup justifyContent="spaceBetween">
            <Term label="Last updated" />
            <Definition label={metaData.lastUpdated} />
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup justifyContent="spaceBetween">
            <Term label="Engine" />
            <Definition label={metaData.engineId} />
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup justifyContent="spaceBetween">
            <Term label="Clicks (7 days)" />
            <Definition label={metaData.clickCount} />
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiPopoverFooter>
        <EuiButton
          iconType="trash"
          color="danger"
          size="s"
          onClick={closePopover}
          fullWidth>
          Delete document
        </EuiButton>
      </EuiPopoverFooter>
    </EuiPopover>
  )
  return (
    <div className="resultHeader">
      <EuiText size="s">
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem>
            <EuiLink><strong>{title}</strong></EuiLink>
          </EuiFlexItem>
          {actions.length >= 1 && (
            <EuiFlexItem grow={false}>
              <ResultActions actions={actions} />
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            {popover}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiText>
    </div>
  )
}
