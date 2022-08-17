export interface AnalyticsCollection {
  id: string;
  name: string;
  event_retention_day_length: number;
}

export type AnalyticsCollectionDocument = Omit<AnalyticsCollection, 'id'>;
