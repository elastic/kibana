/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, Subscription } from 'rxjs';
import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { createReactOverlays } from '@kbn/kibana-react-plugin/public';
import { UI_SETTINGS } from '@kbn/data-plugin/public';
import { UiActionsSetup, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import {
  CONTEXT_MENU_TRIGGER,
  PANEL_BADGE_TRIGGER,
  EmbeddableSetup,
  EmbeddableStart,
} from '@kbn/embeddable-plugin/public';
import { ILicense, LicensingPluginSetup, LicensingPluginStart } from '@kbn/licensing-plugin/public';
import { createStartServicesGetter, Storage } from '@kbn/kibana-utils-plugin/public';
import { CustomTimeRangeAction } from './custom_time_range_action';
import { CustomTimeRangeBadge } from './custom_time_range_badge';
import { CommonlyUsedRange } from './types';
import { UiActionsServiceEnhancements } from './services';
import { createPublicDrilldownManager, PublicDrilldownManagerComponent } from './drilldowns';
import { dynamicActionEnhancement } from './dynamic_actions/dynamic_action_enhancement';

interface SetupDependencies {
  embeddable: EmbeddableSetup; // Embeddable are needed because they register basic triggers/actions.
  uiActions: UiActionsSetup;
  licensing: LicensingPluginSetup;
}

export interface StartDependencies {
  embeddable: EmbeddableStart;
  uiActions: UiActionsStart;
  licensing: LicensingPluginStart;
}

export interface SetupContract
  extends UiActionsSetup,
    Pick<UiActionsServiceEnhancements, 'registerDrilldown'> {}

export interface StartContract
  extends UiActionsStart,
    Pick<
      UiActionsServiceEnhancements,
      | 'getActionFactory'
      | 'hasActionFactory'
      | 'getActionFactories'
      | 'telemetry'
      | 'extract'
      | 'inject'
    > {
  DrilldownManager: PublicDrilldownManagerComponent;
}

export class AdvancedUiActionsPublicPlugin
  implements Plugin<SetupContract, StartContract, SetupDependencies, StartDependencies>
{
  readonly licenseInfo = new BehaviorSubject<ILicense | undefined>(undefined);
  private getLicenseInfo(): ILicense {
    if (!this.licenseInfo.getValue()) {
      throw new Error(
        'AdvancedUiActionsPublicPlugin: License is not ready! License becomes available only after setup.'
      );
    }
    return this.licenseInfo.getValue()!;
  }
  private enhancements?: UiActionsServiceEnhancements;
  private subs: Subscription[] = [];

  constructor(initializerContext: PluginInitializerContext) {}

  public setup(
    core: CoreSetup<StartDependencies>,
    { embeddable, uiActions, licensing }: SetupDependencies
  ): SetupContract {
    const startServices = createStartServicesGetter(core.getStartServices);
    this.enhancements = new UiActionsServiceEnhancements({
      getLicense: () => this.getLicenseInfo(),
      featureUsageSetup: licensing.featureUsage,
      getFeatureUsageStart: () => startServices().plugins.licensing.featureUsage,
    });
    embeddable.registerEnhancement(dynamicActionEnhancement(this.enhancements));
    return {
      ...uiActions,
      ...this.enhancements,
    };
  }

  public start(core: CoreStart, { uiActions, licensing }: StartDependencies): StartContract {
    this.subs.push(licensing.license$.subscribe(this.licenseInfo));

    const dateFormat = core.uiSettings.get('dateFormat') as string;
    const commonlyUsedRanges = core.uiSettings.get(
      UI_SETTINGS.TIMEPICKER_QUICK_RANGES
    ) as CommonlyUsedRange[];
    const { openModal } = createReactOverlays(core);
    const timeRangeAction = new CustomTimeRangeAction({
      openModal,
      dateFormat,
      commonlyUsedRanges,
    });
    uiActions.addTriggerAction(CONTEXT_MENU_TRIGGER, timeRangeAction);

    const timeRangeBadge = new CustomTimeRangeBadge({
      openModal,
      dateFormat,
      commonlyUsedRanges,
    });
    uiActions.addTriggerAction(PANEL_BADGE_TRIGGER, timeRangeBadge);

    return {
      ...uiActions,
      ...this.enhancements!,
      DrilldownManager: createPublicDrilldownManager({
        actionFactories: this.enhancements!.getActionFactories(),
        getTrigger: (triggerId) => uiActions.getTrigger(triggerId),
        storage: new Storage(window?.localStorage),
        toastService: core.notifications.toasts,
        docsLink: core.docLinks.links.dashboard.drilldowns,
        triggerPickerDocsLink: core.docLinks.links.dashboard.drilldownsTriggerPicker,
      }),
    };
  }

  public stop() {
    this.subs.forEach((s) => s.unsubscribe());
  }
}
