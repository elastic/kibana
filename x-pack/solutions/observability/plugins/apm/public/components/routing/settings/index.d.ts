import * as t from 'io-ts';
import React from 'react';
export declare const settingsRoute: {
    '/settings': {
        element: React.JSX.Element;
        children: {
            '/settings/general-settings': {
                element: React.ReactElement;
            };
            '/settings/agent-configuration': {
                element: React.ReactElement;
            };
            '/settings/agent-configuration/create': {
                params: t.PartialC<{
                    query: t.PartialC<{
                        pageStep: t.UnionC<[t.LiteralC<import("../../../../common/agent_configuration/constants").AgentConfigurationPageStep.ChooseService>, t.LiteralC<import("../../../../common/agent_configuration/constants").AgentConfigurationPageStep.ChooseSettings>, t.LiteralC<import("../../../../common/agent_configuration/constants").AgentConfigurationPageStep.Review>]>;
                    }>;
                }>;
                element: React.ReactElement;
            };
            '/settings/agent-configuration/edit': {
                params: t.PartialC<{
                    query: t.PartialC<{
                        environment: t.StringC;
                        name: t.StringC;
                        pageStep: t.UnionC<[t.LiteralC<import("../../../../common/agent_configuration/constants").AgentConfigurationPageStep.ChooseService>, t.LiteralC<import("../../../../common/agent_configuration/constants").AgentConfigurationPageStep.ChooseSettings>, t.LiteralC<import("../../../../common/agent_configuration/constants").AgentConfigurationPageStep.Review>]>;
                    }>;
                }>;
                element: React.ReactElement;
            };
            '/settings/apm-indices': {
                element: React.ReactElement;
            };
            '/settings/custom-links': {
                element: React.ReactElement;
            };
            '/settings/schema': {
                element: React.ReactElement;
            };
            '/settings/anomaly-detection': {
                element: React.ReactElement;
            };
            '/settings/agent-keys': {
                element: React.ReactElement;
            };
            '/settings/agent-explorer': {
                params: t.TypeC<{
                    query: t.IntersectionC<[t.TypeC<{
                        environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
                    }>, t.TypeC<{
                        kuery: t.StringC;
                        agentLanguage: t.StringC;
                        serviceName: t.StringC;
                    }>]>;
                }>;
                element: React.ReactElement;
            };
            '/settings': {
                element: React.JSX.Element;
            };
        };
    };
};
