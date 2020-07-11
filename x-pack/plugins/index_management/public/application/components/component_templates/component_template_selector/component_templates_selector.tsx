/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import classNames from 'classnames';
import React, { useState, useEffect, useRef } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiEmptyPrompt, EuiLink, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import { ComponentTemplateListItem } from '../../../../../common';
import { SectionError, SectionLoading } from '../shared_imports';
import { ComponentTemplateDetailsFlyout } from '../component_template_details';
import { CreateButtonPopOver } from './components';
import { ComponentTemplates } from './component_templates';
import { ComponentTemplatesSelection } from './component_templates_selection';
import { useApi } from '../component_templates_context';

import './component_templates_selector.scss';

interface Props {
  onChange: (components: string[]) => void;
  onComponentsLoaded: (components: ComponentTemplateListItem[]) => void;
  defaultValue: string[];
  docUri: string;
  emptyPrompt?: {
    text?: string | JSX.Element;
    showCreateButton?: boolean;
  };
}

const i18nTexts = {
  icons: {
    view: i18n.translate('xpack.idxMgmt.componentTemplatesSelector.viewItemIconLabel', {
      defaultMessage: 'View',
    }),
    select: i18n.translate('xpack.idxMgmt.componentTemplatesSelector.selectItemIconLabel', {
      defaultMessage: 'Select',
    }),
    remove: i18n.translate('xpack.idxMgmt.componentTemplatesSelector.removeItemIconLabel', {
      defaultMessage: 'Remove',
    }),
  },
};

export const ComponentTemplatesSelector = ({
  onChange,
  defaultValue,
  onComponentsLoaded,
  docUri,
  emptyPrompt: { text, showCreateButton } = {},
}: Props) => {
  const { data: components, isLoading, error } = useApi().useLoadComponentTemplates();
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [componentsSelected, setComponentsSelected] = useState<ComponentTemplateListItem[]>([]);
  const isInitialized = useRef(false);

  const hasSelection = Object.keys(componentsSelected).length > 0;
  const hasComponents = components && components.length > 0 ? true : false;

  useEffect(() => {
    if (components) {
      if (
        defaultValue.length > 0 &&
        componentsSelected.length === 0 &&
        isInitialized.current === false
      ) {
        // Once the components are loaded we check the ones selected
        // from the defaultValue provided
        const nextComponentsSelected = defaultValue
          .map((name) => components.find((comp) => comp.name === name))
          .filter(Boolean) as ComponentTemplateListItem[];

        setComponentsSelected(nextComponentsSelected);
        onChange(nextComponentsSelected.map(({ name }) => name));
        isInitialized.current = true;
      } else {
        onChange(componentsSelected.map(({ name }) => name));
      }
    }
  }, [defaultValue, components, componentsSelected, onChange]);

  useEffect(() => {
    if (!isLoading && !error) {
      onComponentsLoaded(components ?? []);
    }
  }, [isLoading, error, components, onComponentsLoaded]);

  const onSelectionReorder = (reorderedComponents: ComponentTemplateListItem[]) => {
    setComponentsSelected(reorderedComponents);
  };

  const renderLoading = () => (
    <SectionLoading>
      <FormattedMessage
        id="xpack.idxMgmt.componentTemplatesSelector.loadingComponentsDescription"
        defaultMessage="Loading component templates…"
      />
    </SectionLoading>
  );

  const renderError = () => (
    <SectionError
      title={
        <FormattedMessage
          id="xpack.idxMgmt.componentTemplatesSelector.loadingComponentsErrorMessage"
          defaultMessage="Error loading components"
        />
      }
      error={error!}
    />
  );

  const renderSelector = () => (
    <EuiFlexGroup className="componentTemplatesSelector">
      {/* Selection */}
      <EuiFlexItem
        className={classNames('componentTemplatesSelector__selection', {
          'componentTemplatesSelector__selection--is-empty': !hasSelection,
        })}
      >
        {hasSelection ? (
          <>
            <div className="componentTemplatesSelector__selection__header">
              <FormattedMessage
                id="xpack.idxMgmt.componentTemplatesSelector.selectionHeader.componentsSelectedLabel"
                defaultMessage="Components selected: {count}"
                values={{
                  count: (
                    <span className="componentTemplatesSelector__selection__header__count">
                      {componentsSelected.length}
                    </span>
                  ),
                }}
              />
            </div>
            <div className="eui-yScrollWithShadows componentTemplatesSelector__selection__content">
              <ComponentTemplatesSelection
                components={componentsSelected}
                onReorder={onSelectionReorder}
                listItemProps={{
                  onViewDetail: (component: ComponentTemplateListItem) => {
                    setSelectedComponent(component.name);
                  },
                  actions: [
                    {
                      label: i18nTexts.icons.remove,
                      icon: 'minusInCircle',
                      handler: (component: ComponentTemplateListItem) => {
                        setComponentsSelected((prev) => {
                          return prev.filter(({ name }) => component.name !== name);
                        });
                      },
                    },
                  ],
                }}
              />
            </div>
          </>
        ) : (
          <div>
            <FormattedMessage
              id="xpack.idxMgmt.componentTemplatesSelector.noComponentSelectedLabel"
              defaultMessage="No component template selected."
            />
          </div>
        )}
      </EuiFlexItem>

      {/* List of components */}
      <EuiFlexItem>
        <ComponentTemplates
          isLoading={isLoading}
          components={components ?? []}
          listItemProps={{
            onViewDetail: (component: ComponentTemplateListItem) => {
              setSelectedComponent(component.name);
            },
            actions: [
              {
                label: i18nTexts.icons.select,
                icon: 'plusInCircle',
                handler: (component: ComponentTemplateListItem) => {
                  setComponentsSelected((prev) => {
                    return [...prev, component];
                  });
                },
              },
            ],
            isSelected: (component: ComponentTemplateListItem) => {
              return componentsSelected.find(({ name }) => component.name === name) !== undefined;
            },
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  const renderComponentDetails = () => {
    if (!selectedComponent) {
      return null;
    }

    return (
      <ComponentTemplateDetailsFlyout
        onClose={() => setSelectedComponent(null)}
        componentTemplateName={selectedComponent}
      />
    );
  };

  if (isLoading) {
    return renderLoading();
  } else if (error) {
    return renderError();
  } else if (hasComponents) {
    return (
      <>
        {renderSelector()}
        {renderComponentDetails()}
      </>
    );
  }

  // No components: render empty prompt
  const emptyPromptBody = (
    <EuiText color="subdued">
      <p>
        {text ?? (
          <FormattedMessage
            id="xpack.idxMgmt.componentTemplatesSelector.emptyPromptDescription"
            defaultMessage="Components templates let you save index settings, mappings and aliases and inherit from them in index templates."
          />
        )}
        <br />
        <EuiLink href={docUri} target="_blank" external>
          <FormattedMessage
            id="xpack.idxMgmt.componentTemplatesSelector.emptyPromptLearnMoreLinkText"
            defaultMessage="Learn more."
          />
        </EuiLink>
      </p>
    </EuiText>
  );
  return (
    <EuiEmptyPrompt
      iconType="managementApp"
      title={
        <h2>
          <FormattedMessage
            id="xpack.idxMgmt.componentTemplatesSelector.emptyPromptTitle"
            defaultMessage="You don’t have any components yet"
          />
        </h2>
      }
      body={emptyPromptBody}
      actions={showCreateButton ? <CreateButtonPopOver anchorPosition="downCenter" /> : undefined}
      data-test-subj="emptyPrompt"
    />
  );
};
