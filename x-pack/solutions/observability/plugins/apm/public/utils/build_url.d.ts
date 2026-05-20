export interface ItemType {
    url?: {
        scheme?: string;
        path?: string;
    };
    server?: {
        address?: string;
        port?: number;
    };
}
export declare const buildUrl: (item?: ItemType) => string | undefined;
