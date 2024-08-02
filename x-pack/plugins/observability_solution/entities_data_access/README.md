# Entities data access

Exposes services to access entities data.

## Index pattern service

The `EntityIndexPatternService` exposes functions to resolve the index pattern where entity date would be written to for a given combination of:
* Entity definition ID
* Entity type
* Entity schema version
* Entity dataset

For example `.entities.v1.latest.my_definition`.

The options provided to the functions can be single values or arrays to resolve multiple patterns at once.

### indexPattern

If you want to query entities regardless of which definition produced them or which type they are of but want to limit the dataset or schema version, you can call the `indexPattern` function, like this:
```javascript
indexPatternService.indexPattern({
    datasets: 'latest',
    schemaVersion: 'v1',
});
```

Which will return the following:
```javascript
{
    latestIndexPattern: '.entities.v1.latest.*',
}
```

### indexPatternByDefinitionId

If you want to query entities produced by a specific definition, you can call the `indexPatternByDefinitionId` function, like this:
```javascript
indexPatternService.indexPatternByDefinitionId(
    ['my_definition_id', 'my_second_definition'],
    {
        datasets: 'latest',
    }
);
```

Which will return the following:
```javascript
{
    latestIndexPattern: '.entities.*.latest.my_definition_id,.entities.*.latest.my_second_definition',
}
```

### indexPatternByType

If you want to query entities of a certain type, you can call the `indexPatternByType` function, like this:
```javascript
await indexPatternService.indexPatternByType('service', {
    soClient,
    datasets: 'latest',
    schemaVersion: 'v1',
});
```

Which will return the following:
```javascript
{
    latestIndexPattern: '.entities.v1.latest.my_definition_id'
}
```
