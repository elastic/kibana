# Asset Schema

Last update: 2023-06-08

_Note: This is a living document and should only be relied on by developers of asset collectors and the developers who are building the Asset API. Users of the Asset API should ONLY rely on the Asset API documentation itself, without worrying about this schema._

## Fields

### **asset.ean** (required, string)

The EAN (Elastic Asset Name) is the URN-style unique identifier for an individual asset. It is currently constructed as {kind}:{local-id}.

### **asset.id** (required, string)

This is the local identifier for this individual asset, which should hopefully be unique within the asset's "kind" value.

### **asset.kind** (required, AssetKind)

One of a small set of valid AssetKind values representing the high-level categorizations of assets.

#### Valid values

**host**

TBA: description of the "host" kind

**container**

TBA: description of the "container" kind

### **asset.type** (optional, AssetType)

One of a set of AssetType values aligned with this asset's dataset, usually in line with how this asset was collected. This value is usually not useful for end users, but can be useful for grouping things by how they were collected.

### **asset.name** (optional, string)

Optional, human-friendly name for this asset.

### **asset.parents** (optional, AssetEan[])

A list of EAN values corresponding to this asset's direct parents.

### **asset.children** (optional, AssetEan[])

A list of EAN values corresponding to this asset's direct children.

### **asset.references** (optional, AssetEan[])

A list of EAN values corresponding to any other assets this asset is related to, which are not direct parents or children.
