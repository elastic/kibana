export interface SectionDescriptor {
    key: string;
    label: string;
    properties: Array<{
        field: string;
        value: string[] | number[];
    }>;
}
