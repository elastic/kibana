import React from 'react';
import type { ApmPluginContextValue } from '../../../context/apm_plugin/apm_plugin_context';
import type { ApmPluginStartDeps, ApmServices } from '../../../plugin';
export declare function ApmAppRoot({ apmPluginContextValue, pluginsStart, apmServices, }: {
    apmPluginContextValue: ApmPluginContextValue;
    pluginsStart: ApmPluginStartDeps;
    apmServices: ApmServices;
}): React.JSX.Element;
