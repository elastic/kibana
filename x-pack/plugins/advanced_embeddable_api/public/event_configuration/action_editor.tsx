/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiSelect,
} from '@elastic/eui';
import { EuiSpacer } from '@elastic/eui';
import React from 'react';
import chrome from 'ui/chrome';
import {
  Embeddable,
  embeddableFactories,
  Trigger,
  triggerRegistry,
  getActionsForTrigger,
  Container,
  actionRegistry,
} from '../../../../../src/legacy/core_plugins/embeddable_api/public';
import { ConfigureTemplateParameters } from './configure_template_parameters';
import {
  removeTriggerActionMapping,
  actionFactoryRegistry,
  deleteAction,
  getAction,
  isDynamicAction,
  saveAction,
  addTriggerActionMapping,
  DynamicAction,
} from '../dynamic_actions';

export interface ActionEditorProps {
  clearEditor: () => void;
  action: DynamicAction;
  embeddable: Embeddable;
  selectedTriggerId?: string;
  container?: Container;
}
interface ActionEditorState {
  action: DynamicAction;
  config: string;
  selectedTrigger: string;
  triggerIds: string[];
  factoryType: string;
}

export class ActionEditor extends React.Component<ActionEditorProps, ActionEditorState> {
  private editorRoot?: React.RefObject<HTMLDivElement>;
  private triggers?: Trigger[];
  private setEditorRoot: (element: React.RefObject<HTMLDivElement>) => void;

  constructor(props: ActionEditorProps) {
    super(props);
    this.state = {
      config: this.props.action.serialized().configuration,
      selectedTrigger: this.props.selectedTriggerId || '',
      triggerIds: [],
      factoryType: this.props.embeddable
        ? this.props.embeddable.type
        : Object.values(embeddableFactories.getFactories())[0].name,
      action: props.action,
    };

    this.setEditorRoot = (element: React.RefObject<HTMLDivElement>) => {
      this.editorRoot = element;

      if (this.state.action && this.editorRoot && this.state.action.type) {
        const factory = actionFactoryRegistry.getFactoryById(this.state.action.type);
        factory.renderEditor(this.editorRoot, this.state.config, this.onChange);
      }
    };
  }

  public async componentDidMount() {
    if (this.props.action.id) {
      const action = await getAction(this.props.action.id, this.props.embeddable);
      if (action && isDynamicAction(action)) {
        this.setState({ action, config: action.serialized().configuration });
      }
    }

    this.triggers = triggerRegistry.getTriggers().filter(trigger => {
      if (this.props.embeddable && !this.props.embeddable.supportsTrigger(trigger)) {
        return false;
      }
      return !this.props.selectedTriggerId || trigger.id === this.props.selectedTriggerId;
    });

    this.setState({
      triggerIds: this.triggers.map(trigger => trigger.id),
    });
  }

  public saveAndClose = async () => {
    if (this.state.action) {
      this.state.action.updateConfiguration(this.state.config);

      await saveAction(this.state.action, this.props.embeddable);

      this.cancel();
    }
  };

  public deleteAndClose = async () => {
    if (this.state.action && this.state.action.id) {
      await deleteAction(this.state.action.id, this.props.embeddable);
    }
    this.cancel();
  };

  public setName = (e: any) => {
    const name = e.target.value;
    this.setState(prevState => {
      const action = prevState.action;
      if (action) {
        action.title = name;
      }
      return {
        action,
      };
    });
  };

  public renderElementTypeSelect() {
    if (this.props.embeddable) {
      return (
        <EuiFormRow label="Element Type">
          <EuiSelect
            value={this.props.embeddable.type}
            options={this.getFactoryTypeOptions()}
            onChange={this.selectFactory}
            disabled={true}
          />
        </EuiFormRow>
      );
    }
    return (
      <EuiFormRow label="Element Type">
        <EuiSelect options={this.getFactoryTypeOptions()} onChange={this.selectFactory} />
      </EuiFormRow>
    );
  }

  public render() {
    if (!this.state.action) {
      return null;
    }

    const trigger = this.triggers
      ? this.triggers.find(t => this.state.selectedTrigger === t.id)
      : undefined;

    const factory = actionFactoryRegistry.getFactoryById(this.state.action.type);
    const actionFactoryTitle = factory.title;
    return (
      <EuiForm>
        <h3>Create new {actionFactoryTitle}</h3>
        <EuiSpacer size="m" />
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFormRow label="Name">
              <EuiFieldText onChange={this.setName} value={this.state.action.title} />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>{this.renderTriggerSelect()}</EuiFlexItem>
        </EuiFlexGroup>

        <EuiFlexGroup>
          <EuiFlexItem>
            <div ref={this.setEditorRoot} />
          </EuiFlexItem>
        </EuiFlexGroup>

        {factory.showParameterization() && (
          <ConfigureTemplateParameters
            onMappingChange={this.onMappingChange}
            embeddable={this.props.embeddable}
            trigger={trigger}
            factoryName={this.state.factoryType}
            embeddableTemplateMapping={this.state.action.embeddableTemplateMapping}
          />
        )}
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiButton color="danger" onClick={this.deleteAndClose}>
              Delete
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton onClick={this.saveAndClose}>Save</EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton onClick={this.cancel}>Close</EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiForm>
    );
  }

  private selectFactory = (e: any) => {
    this.setState({ factoryType: e.target.value });
  };

  private getFactoryTypeOptions() {
    if (this.props.embeddable) {
      return [
        {
          value: this.props.embeddable.type,
          text: this.props.embeddable.type,
        },
      ];
    }

    return Object.values(embeddableFactories.getFactories()).map(factory => ({
      value: factory.name,
      text: factory.name,
    }));
  }

  private onMappingChange = (newMapping: { [key: string]: string }) => {
    this.setState(prevState => {
      const action = prevState.action;
      if (action) {
        action.embeddableTemplateMapping = newMapping;
        return { action };
      }
    });
  };

  private onChange = (config: string) => {
    this.setState(
      {
        config,
      },
      () => {
        if (this.state.action && this.state.action.type) {
          const factory = actionFactoryRegistry.getFactoryById(this.state.action.type);
          factory.renderEditor(this.editorRoot, this.state.config, this.onChange);
        }
      }
    );
  };

  private cancel = () => {
    this.props.clearEditor();
  };

  private getTriggerOptions() {
    if (!this.triggers) {
      return [];
    }

    return this.triggers.map(trigger => {
      return {
        value: trigger.id,
        text: trigger.title,
      };
    });
  }

  private changeTrigger = (evt: any) => {
    this.setState({ selectedTrigger: evt.target.value });
  };

  private renderTriggerSelect() {
    if (!this.state.action) {
      return null;
    }
    if (!this.state.action.allowTemplateMapping()) {
      return null;
    }

    const selectedTrigger = this.state.selectedTrigger;
    return (
      <EuiFormRow label="Trigger">
        <EuiSelect
          options={this.getTriggerOptions()}
          value={selectedTrigger}
          onChange={this.changeTrigger}
        />
      </EuiFormRow>
    );
  }
}
