export declare enum WaterfallLegendType {
    ServiceName = "serviceName",
    Type = "type"
}
export interface IWaterfallLegend {
    type: WaterfallLegendType;
    value: string | undefined;
    color: string;
}
