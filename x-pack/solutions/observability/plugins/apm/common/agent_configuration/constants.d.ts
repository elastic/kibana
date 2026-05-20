import * as t from 'io-ts';
export declare enum AgentConfigurationPageStep {
    ChooseService = "choose-service-step",
    ChooseSettings = "choose-settings-step",
    Review = "review-step"
}
export declare const agentConfigurationPageStepRt: t.UnionC<[t.LiteralC<AgentConfigurationPageStep.ChooseService>, t.LiteralC<AgentConfigurationPageStep.ChooseSettings>, t.LiteralC<AgentConfigurationPageStep.Review>]>;
